"""
src/ml/registry.py
------------------
Model Registry service:
- Manages training, evaluation, versioning, persistence, and comparison of ML defect prediction models.
- Provides a common interface for model execution and leaderboard benchmarking.
"""

import os
import json
import time
import shutil
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from sklearn.model_selection import train_test_split

from src.ml.models import ALGORITHM_REGISTRY, XGB_AVAILABLE, LGBM_AVAILABLE
from src.ml.base import BaseBugModel
from backend.database.db import get_db

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MODELS_DIR = os.path.join(PROJECT_ROOT, "models")
VERSIONS_DIR = os.path.join(MODELS_DIR, "versions")
REGISTRY_META_FILE = os.path.join(MODELS_DIR, "model_registry.json")

DEFAULT_FEATURES = [
    "loc", "complexity", "function_count", "avg_function_size", "max_function_size",
    "dependency_count", "commit_count", "developer_count", "lines_added",
    "lines_deleted", "code_churn", "recent_commit_count", "days_since_last_change",
    "previous_bug_count",
]


class ModelRegistry:
    def __init__(self, models_dir: str = MODELS_DIR):
        self.models_dir = models_dir
        self.versions_dir = os.path.join(models_dir, "versions")
        os.makedirs(self.models_dir, exist_ok=True)
        os.makedirs(self.versions_dir, exist_ok=True)
        self.meta_file = os.path.join(self.models_dir, "model_registry.json")
        self._init_meta()

    def _init_meta(self):
        if not os.path.exists(self.meta_file):
            default_meta = {
                "active_model": "xgboost" if XGB_AVAILABLE else "random_forest",
                "models": {}
            }
            with open(self.meta_file, "w") as f:
                json.dump(default_meta, f, indent=2)

    def get_meta(self) -> Dict[str, Any]:
        try:
            with open(self.meta_file, "r") as f:
                return json.load(f)
        except Exception:
            return {"active_model": "random_forest", "models": {}}

    def save_meta(self, meta: Dict[str, Any]):
        with open(self.meta_file, "w") as f:
            json.dump(meta, f, indent=2)

    def get_supported_algorithms(self) -> List[Dict[str, Any]]:
        algos = [
            {"id": "random_forest", "name": "Random Forest", "available": True, "description": "Robust bagging ensemble with feature importances"},
            {"id": "decision_tree", "name": "Decision Tree", "available": True, "description": "Fast, interpretable rule-based classifier"},
            {"id": "logistic_regression", "name": "Logistic Regression", "available": True, "description": "Linear classifier with standardized features and balanced weights"},
            {"id": "svm", "name": "Support Vector Machine (SVM)", "available": True, "description": "Kernel-based max-margin classifier with probability calibration"},
            {"id": "xgboost", "name": "XGBoost", "available": XGB_AVAILABLE, "description": "Optimized gradient tree boosting with scale_pos_weight"},
            {"id": "lightgbm", "name": "LightGBM", "available": LGBM_AVAILABLE, "description": "High-performance leaf-wise gradient boosting"},
        ]
        return algos

    def train_model(
        self,
        algorithm_id: str,
        df: pd.DataFrame,
        target_col: str = "future_bug",
        feature_cols: Optional[List[str]] = None,
        test_split: float = 0.25,
        hyperparams: Optional[Dict[str, Any]] = None,
        triggered_by: str = "user",
        model_name: Optional[str] = None
    ) -> Dict[str, Any]:
        algo_cls = ALGORITHM_REGISTRY.get(algorithm_id.lower().strip())
        if not algo_cls:
            raise ValueError(f"Unsupported algorithm '{algorithm_id}'. Supported: {list(ALGORITHM_REGISTRY.keys())}")

        features = feature_cols or [c for c in DEFAULT_FEATURES if c in df.columns]
        if not features:
            features = [c for c in df.columns if c != target_col and pd.api.types.is_numeric_dtype(df[c])]

        # Data cleaning and validation
        clean_df = df.dropna(subset=features + [target_col])
        X = clean_df[features].fillna(0).astype(float)
        y = clean_df[target_col].astype(int)

        if len(y) < 8 or y.nunique() < 2:
            raise ValueError("Dataset must have at least 8 samples and contain both bug (1) and clean (0) samples.")

        # Stratified train/test split preventing data leakage
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_split, random_state=42, stratify=y
        )

        display_name = model_name or algo_cls().name
        model_instance: BaseBugModel = algo_cls(name=display_name, params=hyperparams)
        model_instance.train(X_train, y_train, feature_names=features)

        # Held-out evaluation
        metrics = model_instance.evaluate(X_test, y_test)
        feature_importances = model_instance.get_feature_importances()

        # Versioning
        version_tag = f"v_{int(time.time())}_{algorithm_id}"
        version_dir = os.path.join(self.versions_dir, version_tag)
        os.makedirs(version_dir, exist_ok=True)
        model_file = os.path.join(version_dir, "model.joblib")
        model_instance.save(model_file)

        # Standard file fallback for legacy scripts
        legacy_filename = f"{algorithm_id}.joblib"
        shutil.copy2(model_file, os.path.join(self.models_dir, legacy_filename))

        # Save metadata to DB
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO model_versions (
                version_tag, algorithm, training_samples, precision_score, recall_score,
                f1_score, roc_auc, pr_auc, top20_recall, model_path, is_active, triggered_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
            """,
            (
                version_tag, display_name, len(X_train),
                metrics.get("precision"), metrics.get("recall"), metrics.get("f1"),
                metrics.get("roc_auc"), metrics.get("pr_auc"), metrics.get("top_20pct_recall"),
                model_file, triggered_by
            )
        )
        conn.commit()
        conn.close()

        # Update registry JSON
        meta = self.get_meta()
        meta["models"][version_tag] = {
            "algorithm": algorithm_id,
            "name": display_name,
            "version_tag": version_tag,
            "metrics": metrics,
            "features": features,
            "feature_importances": feature_importances,
            "created_at": time.time(),
            "model_path": model_file
        }
        self.save_meta(meta)

        return {
            "success": True,
            "version_tag": version_tag,
            "algorithm": algorithm_id,
            "name": display_name,
            "metrics": metrics,
            "feature_importances": feature_importances,
            "train_samples": len(X_train),
            "test_samples": len(X_test)
        }

    def compare_models(
        self,
        df: pd.DataFrame,
        target_col: str = "future_bug",
        feature_cols: Optional[List[str]] = None,
        test_split: float = 0.25
    ) -> List[Dict[str, Any]]:
        """Trains and compares all available models on the exact same dataset split."""
        results = []
        for algo_id, algo_cls in ALGORITHM_REGISTRY.items():
            if algo_id == "xgboost" and not XGB_AVAILABLE:
                continue
            if algo_id == "lightgbm" and not LGBM_AVAILABLE:
                continue

            try:
                res = self.train_model(
                    algorithm_id=algo_id,
                    df=df,
                    target_col=target_col,
                    feature_cols=feature_cols,
                    test_split=test_split,
                    triggered_by="comparison_benchmark"
                )
                results.append({
                    "algorithm": algo_id,
                    "name": res["name"],
                    "version_tag": res["version_tag"],
                    **res["metrics"]
                })
            except Exception as e:
                results.append({
                    "algorithm": algo_id,
                    "name": algo_id,
                    "error": str(e)
                })

        # Save model comparison table
        comp_df = pd.DataFrame(results)
        comp_df.to_csv(os.path.join(self.models_dir, "model_comparison.csv"), index=False)
        return results

    def set_active_model(self, version_tag_or_algo: str) -> bool:
        meta = self.get_meta()
        meta["active_model"] = version_tag_or_algo
        self.save_meta(meta)

        # Update in database
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("UPDATE model_versions SET is_active = 0")
        cursor.execute("UPDATE model_versions SET is_active = 1 WHERE version_tag = ?", (version_tag_or_algo,))
        conn.commit()
        conn.close()
        return True

    def load_active_model(self) -> Tuple[str, Any, Any]:
        """Loads currently active model, or falls back to first available on disk."""
        meta = self.get_meta()
        active = meta.get("active_model", "random_forest")

        # Check if version_tag
        if active in meta.get("models", {}):
            m_path = meta["models"][active]["model_path"]
            if os.path.exists(m_path):
                algo_id = meta["models"][active]["algorithm"]
                model_obj = ALGORITHM_REGISTRY[algo_id].load(m_path)
                return model_obj.name, model_obj, getattr(model_obj, "scaler", None)

        # Fallback to standard filenames
        for algo_id, fname, needs_scaler in [
            ("xgboost", "xgboost.joblib", False),
            ("random_forest", "random_forest.joblib", False),
            ("decision_tree", "decision_tree.joblib", False),
            ("logistic_regression", "logistic_regression.joblib", True),
            ("svm", "svm.joblib", True),
            ("lightgbm", "lightgbm.joblib", False),
        ]:
            path = os.path.join(self.models_dir, fname)
            if os.path.exists(path):
                try:
                    loaded = joblib.load(path)
                    # Support both dict serialized format and raw sklearn objects
                    if isinstance(loaded, dict) and "model" in loaded:
                        return loaded.get("name", algo_id), loaded["model"], loaded.get("scaler")
                    scaler = joblib.load(os.path.join(self.models_dir, "scaler.joblib")) if needs_scaler else None
                    return algo_id.replace("_", " ").title(), loaded, scaler
                except Exception:
                    pass

        return "None", None, None
