"""
src/ml/base.py
--------------
Unified interface and evaluation protocol for software defect prediction models.
All models must implement this standard interface to be plug-and-play in the Model Registry.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.metrics import (
    precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, confusion_matrix,
    brier_score_loss
)


def compute_top_k_recall(y_true: np.ndarray, y_prob: np.ndarray, k_ratio: float = 0.2) -> float:
    """Fraction of true positive bugs found in the top k% highest-risk files."""
    n = len(y_true)
    if n == 0 or np.sum(y_true) == 0:
        return 0.0
    k = max(1, int(np.ceil(n * k_ratio)))
    top_indices = np.argsort(y_prob)[::-1][:k]
    tp_in_top_k = np.sum(y_true[top_indices] == 1)
    return float(round(tp_in_top_k / np.sum(y_true == 1), 4))


def compute_classification_metrics(y_true: np.ndarray, y_pred: np.ndarray, y_prob: np.ndarray) -> Dict[str, Any]:
    """Calculates comprehensive metrics including PR-AUC, ROC-AUC, top-k recall, and confusion matrix."""
    y_true = np.asarray(y_true, dtype=int)
    y_pred = np.asarray(y_pred, dtype=int)
    y_prob = np.asarray(y_prob, dtype=float)

    cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
    tn, fp, fn, tp = int(cm[0, 0]), int(cm[0, 1]), int(cm[1, 0]), int(cm[1, 1])

    metrics: Dict[str, Any] = {
        "precision": float(round(precision_score(y_true, y_pred, zero_division=0), 4)),
        "recall": float(round(recall_score(y_true, y_pred, zero_division=0), 4)),
        "f1": float(round(f1_score(y_true, y_pred, zero_division=0), 4)),
        "accuracy": float(round(np.mean(y_true == y_pred), 4)),
        "tp": tp,
        "fp": fp,
        "tn": tn,
        "fn": fn,
        "confusion_matrix": [[tn, fp], [fn, tp]],
        "top_20pct_recall": compute_top_k_recall(y_true, y_prob, 0.20),
    }

    # ROC-AUC & PR-AUC require at least 1 sample from each class
    if len(np.unique(y_true)) > 1:
        metrics["roc_auc"] = float(round(roc_auc_score(y_true, y_prob), 4))
        metrics["pr_auc"] = float(round(average_precision_score(y_true, y_prob), 4))
        metrics["brier_score"] = float(round(brier_score_loss(y_true, y_prob), 4))
    else:
        metrics["roc_auc"] = None
        metrics["pr_auc"] = None
        metrics["brier_score"] = None

    return metrics


class BaseBugModel(ABC):
    """Abstract Base Class for Defect Prediction Models."""

    def __init__(self, name: str, algorithm: str, params: Optional[Dict[str, Any]] = None):
        self.name = name
        self.algorithm = algorithm
        self.params = params or {}
        self.model: Any = None
        self.scaler: Any = None
        self.feature_names: List[str] = []
        self.is_trained: bool = False
        self.metrics: Dict[str, Any] = {}

    @abstractmethod
    def train(self, X: pd.DataFrame, y: pd.Series, feature_names: Optional[List[str]] = None) -> Dict[str, Any]:
        """Trains model on features X and label y."""
        pass

    @abstractmethod
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """Returns binary predictions (0 or 1)."""
        pass

    @abstractmethod
    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        """Returns defect probabilities for class 1."""
        pass

    def evaluate(self, X: pd.DataFrame, y: pd.Series) -> Dict[str, Any]:
        """Evaluates model on held-out dataset X, y."""
        y_prob = self.predict_proba(X)
        y_pred = (y_prob >= 0.5).astype(int)
        metrics = compute_classification_metrics(y.to_numpy(), y_pred, y_prob)
        metrics["model_name"] = self.name
        metrics["algorithm"] = self.algorithm
        return metrics

    @abstractmethod
    def get_feature_importances(self) -> Dict[str, float]:
        """Returns mapping from feature name to importance weight."""
        pass

    @abstractmethod
    def save(self, filepath: str) -> None:
        """Serializes model to disk."""
        pass

    @classmethod
    @abstractmethod
    def load(cls, filepath: str) -> "BaseBugModel":
        """Deserializes model from disk."""
        pass
