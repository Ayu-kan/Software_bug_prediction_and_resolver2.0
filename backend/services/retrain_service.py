"""
backend/services/retrain_service.py
------------------------------------
Self-Training Orchestration Service.

Responsibilities:
  1. Decide if enough new labeled samples have accumulated to warrant a retrain.
  2. Build a clean DataFrame from the DB training samples.
  3. Train Random Forest (+ XGBoost if installed) on the combined dataset.
  4. Evaluate on a held-out 25% test split using PR-AUC as the primary metric.
  5. Save a versioned checkpoint under models/versions/v{N}/.
  6. Hot-swap the winning model into models/random_forest.joblib so the
     next analysis call picks it up without a server restart.
  7. Record version metadata + metrics in the model_versions DB table.
"""

import os
import json
import shutil
import logging
import traceback
from typing import Optional, Dict, Any

import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score,
)

from backend.database.db import (
    get_training_dataset,
    get_training_stats,
    save_model_version,
    set_active_model_version,
    mark_samples_used,
    get_model_history,
)

logger = logging.getLogger("retrain_service")

# ---- Configuration --------------------------------------------------------

# Root of the project (two levels up from this file)
_HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(_HERE, "..", ".."))
MODELS_DIR = os.path.join(PROJECT_ROOT, "models")
VERSIONS_DIR = os.path.join(MODELS_DIR, "versions")

RETRAIN_THRESHOLD = int(os.environ.get("RETRAIN_THRESHOLD", "50"))

FEATURE_COLS = [
    "loc", "complexity", "function_count", "avg_function_size", "max_function_size",
    "dependency_count", "commit_count", "developer_count", "lines_added",
    "lines_deleted", "code_churn", "recent_commit_count", "days_since_last_change",
    "previous_bug_count",
]

MIN_CLASS_SAMPLES = 4  # Minimum samples per class required to train


# ---- Public API -----------------------------------------------------------

def should_retrain() -> bool:
    """
    Returns True if the number of new labeled samples since the last retrain
    exceeds RETRAIN_THRESHOLD.
    """
    stats = get_training_stats()
    return stats.get("pending_samples", 0) >= RETRAIN_THRESHOLD


def get_model_status() -> Dict[str, Any]:
    """Returns current active model version stats and pending sample count."""
    stats = get_training_stats()
    history = get_model_history(limit=1)
    return {
        "total_labeled": stats.get("total_labeled", 0),
        "auto_labeled": stats.get("auto_labeled", 0),
        "user_labeled": stats.get("user_labeled", 0),
        "pending_samples": stats.get("pending_samples", 0),
        "retrain_threshold": RETRAIN_THRESHOLD,
        "active_model": stats.get("active_model"),
        "latest_version": history[0] if history else None,
    }


def retrain_models(triggered_by: str = "auto") -> Dict[str, Any]:
    """
    Full retraining pipeline:
      1. Load labeled data from DB
      2. Train Random Forest (+ XGBoost if available)
      3. Evaluate on held-out test set
      4. Save versioned checkpoint + hot-swap active model
      5. Record version in DB
    Returns a result dict with success status, metrics, and version info.
    """
    try:
        # ---- Load data -------------------------------------------------------
        rows = get_training_dataset()
        if not rows:
            return {"success": False, "error": "No labeled training samples found in database."}

        df = pd.DataFrame(rows)
        missing_cols = [c for c in FEATURE_COLS if c not in df.columns]
        for c in missing_cols:
            df[c] = 0.0

        X = df[FEATURE_COLS].fillna(0).astype(float)
        y = df["label"].fillna(0).astype(int)

        # ---- Validate class balance -------------------------------------------
        class_counts = y.value_counts()
        if y.nunique() < 2:
            return {
                "success": False,
                "error": f"Cannot train: only class '{y.unique()[0]}' present. "
                         f"Need at least {MIN_CLASS_SAMPLES} samples of each class."
            }
        if class_counts.min() < MIN_CLASS_SAMPLES:
            minority_class = class_counts.idxmin()
            return {
                "success": False,
                "error": (
                    f"Not enough minority-class samples to train reliably. "
                    f"Class '{minority_class}' has only {class_counts.min()} sample(s). "
                    f"Need at least {MIN_CLASS_SAMPLES}. Keep collecting feedback or wait "
                    f"for more repo scans to accumulate labeled data."
                )
            }

        # ---- Train / test split ----------------------------------------------
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.25, random_state=42, stratify=y
        )

        sample_ids = df["id"].tolist()

        # ---- Determine next version tag --------------------------------------
        history = get_model_history(limit=1)
        if history:
            last_tag = history[0].get("version_tag", "v1.0")
            try:
                major, minor = last_tag.lstrip("v").split(".")
                next_tag = f"v{major}.{int(minor) + 1}"
            except Exception:
                next_tag = "v2.0"
        else:
            next_tag = "v1.0"

        os.makedirs(VERSIONS_DIR, exist_ok=True)
        version_dir = os.path.join(VERSIONS_DIR, next_tag)
        os.makedirs(version_dir, exist_ok=True)

        best_model = None
        best_model_name = None
        best_pr_auc = -1.0
        best_metrics: Dict[str, Any] = {}

        # ---- 1. Random Forest ------------------------------------------------
        rf = RandomForestClassifier(
            n_estimators=300, class_weight="balanced", random_state=42, max_depth=8
        )
        rf.fit(X_train, y_train)
        rf_metrics = _evaluate("Random Forest", rf, X_test, y_test)
        rf_path = os.path.join(version_dir, "random_forest.joblib")
        joblib.dump(rf, rf_path)

        if rf_metrics["pr_auc"] > best_pr_auc:
            best_pr_auc = rf_metrics["pr_auc"]
            best_model = rf
            best_model_name = "Random Forest"
            best_metrics = rf_metrics

        # Record RF version
        _record_version(
            next_tag + "-rf", "random_forest", len(X_train), rf_metrics, rf_path, triggered_by
        )

        # ---- 2. XGBoost (optional) -------------------------------------------
        try:
            from xgboost import XGBClassifier
            pos = max(1, y_train.sum())
            neg = max(1, len(y_train) - y_train.sum())
            xgb = XGBClassifier(
                n_estimators=300, max_depth=4, learning_rate=0.05,
                scale_pos_weight=neg / pos, eval_metric="logloss",
                random_state=42, verbosity=0,
            )
            xgb.fit(X_train, y_train)
            xgb_metrics = _evaluate("XGBoost", xgb, X_test, y_test)
            xgb_path = os.path.join(version_dir, "xgboost.joblib")
            joblib.dump(xgb, xgb_path)

            if xgb_metrics["pr_auc"] > best_pr_auc:
                best_pr_auc = xgb_metrics["pr_auc"]
                best_model = xgb
                best_model_name = "XGBoost"
                best_metrics = xgb_metrics

            _record_version(
                next_tag + "-xgb", "xgboost", len(X_train), xgb_metrics, xgb_path, triggered_by
            )
        except ImportError:
            logger.info("XGBoost not installed — skipping.")
        except Exception as e:
            logger.warning(f"XGBoost training failed: {e}")

        # ---- Hot-swap best model into models/ --------------------------------
        if best_model is not None:
            dest_rf = os.path.join(MODELS_DIR, "random_forest.joblib")
            shutil.copy2(
                os.path.join(version_dir, "random_forest.joblib"),
                dest_rf
            )
            if best_model_name == "XGBoost":
                dest_xgb = os.path.join(MODELS_DIR, "xgboost.joblib")
                shutil.copy2(
                    os.path.join(version_dir, "xgboost.joblib"),
                    dest_xgb
                )

            # Also save updated feature_columns.json
            with open(os.path.join(MODELS_DIR, "feature_columns.json"), "w") as f:
                json.dump(FEATURE_COLS, f)

        # ---- Mark all samples as used ----------------------------------------
        mark_samples_used(sample_ids)

        logger.info(
            f"Retrain complete: {next_tag} | best={best_model_name} | "
            f"PR-AUC={best_metrics.get('pr_auc', 0):.3f} | "
            f"samples={len(X_train)} train / {len(X_test)} test"
        )

        return {
            "success": True,
            "version_tag": next_tag,
            "best_model": best_model_name,
            "training_samples": len(X_train),
            "test_samples": len(X_test),
            "metrics": best_metrics,
            "triggered_by": triggered_by,
        }

    except Exception:
        logger.error("Retrain failed:\n" + traceback.format_exc())
        return {"success": False, "error": "Unexpected error during retraining. Check server logs."}


# ---- Private Helpers -------------------------------------------------------

def _evaluate(name: str, model, X_test, y_test) -> Dict[str, Any]:
    """Evaluates a trained model and returns a metrics dict."""
    y_pred = model.predict(X_test)
    try:
        y_prob = model.predict_proba(X_test)[:, 1]
    except Exception:
        y_prob = y_pred.astype(float)

    metrics: Dict[str, Any] = {
        "model": name,
        "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
        "roc_auc": None,
        "pr_auc": None,
        "top20_recall": None,
    }

    if len(set(y_test)) > 1:
        metrics["roc_auc"] = round(float(roc_auc_score(y_test, y_prob)), 4)
        metrics["pr_auc"] = round(float(average_precision_score(y_test, y_prob)), 4)
        metrics["top20_recall"] = round(float(_top_k_recall(y_test, y_prob, 0.20)), 4)
    else:
        metrics["roc_auc"] = 0.0
        metrics["pr_auc"] = 0.0
        metrics["top20_recall"] = 0.0

    return metrics


def _top_k_recall(y_true, y_scores, k_ratio: float = 0.2) -> float:
    """Of the true bugs, what fraction appear in the top k% riskiest files?"""
    n = len(y_true)
    k = max(1, int(np.ceil(n * k_ratio)))
    order = np.argsort(y_scores)[::-1][:k]
    if hasattr(y_true, "iloc"):
        tp_in_top = y_true.iloc[order].sum()
    else:
        tp_in_top = y_true[order].sum()
    total_pos = y_true.sum()
    if total_pos == 0:
        return 0.0
    return float(tp_in_top / total_pos)


def _record_version(
    version_tag: str,
    algorithm: str,
    n_train: int,
    metrics: Dict[str, Any],
    model_path: str,
    triggered_by: str,
) -> int:
    """Saves a model version to DB and marks it active."""
    vid = save_model_version(
        version_tag=version_tag,
        algorithm=algorithm,
        training_samples=n_train,
        metrics=metrics,
        model_path=model_path,
        triggered_by=triggered_by,
    )
    set_active_model_version(vid)
    return vid
