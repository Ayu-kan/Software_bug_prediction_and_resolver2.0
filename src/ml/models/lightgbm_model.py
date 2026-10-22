"""
src/ml/models/lightgbm_model.py
-------------------------------
LightGBM gradient boosting classifier for rapid and memory-efficient defect prediction.
"""

import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from src.ml.base import BaseBugModel

try:
    from lightgbm import LGBMClassifier
    LGBM_AVAILABLE = True
except ImportError:
    LGBM_AVAILABLE = False


class LightGBMBugModel(BaseBugModel):
    def __init__(self, name: str = "LightGBM", params: Optional[Dict[str, Any]] = None):
        default_params = {
            "n_estimators": 200,
            "max_depth": 5,
            "learning_rate": 0.05,
            "class_weight": "balanced",
            "random_state": 42,
            "verbose": -1
        }
        if params:
            default_params.update(params)
        super().__init__(name=name, algorithm="LightGBM", params=default_params)
        if not LGBM_AVAILABLE:
            self.model = None
        else:
            self.model = LGBMClassifier(**self.params)

    def train(self, X: pd.DataFrame, y: pd.Series, feature_names: Optional[List[str]] = None) -> Dict[str, Any]:
        if not LGBM_AVAILABLE:
            raise ImportError("lightgbm package is not installed. Run: pip install lightgbm")

        self.feature_names = feature_names or list(X.columns)
        X_df = X[self.feature_names].fillna(0).astype(float)
        self.model = LGBMClassifier(**self.params)
        self.model.fit(X_df, y.astype(int))
        self.is_trained = True
        return self.evaluate(X, y)

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        if not self.is_trained or not self.model:
            raise RuntimeError("Model is not trained.")
        X_df = X[self.feature_names].fillna(0).astype(float)
        return self.model.predict(X_df)

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        if not self.is_trained or not self.model:
            raise RuntimeError("Model is not trained.")
        X_df = X[self.feature_names].fillna(0).astype(float)
        return self.model.predict_proba(X_df)[:, 1]

    def get_feature_importances(self) -> Dict[str, float]:
        if not self.is_trained or not self.model:
            return {}
        imps = self.model.feature_importances_
        total = np.sum(imps) or 1.0
        normalized = imps / total
        return {f: float(round(w, 4)) for f, w in zip(self.feature_names, normalized)}

    def save(self, filepath: str) -> None:
        payload = {
            "name": self.name,
            "algorithm": self.algorithm,
            "params": self.params,
            "model": self.model,
            "feature_names": self.feature_names,
            "is_trained": self.is_trained
        }
        joblib.dump(payload, filepath)

    @classmethod
    def load(cls, filepath: str) -> "LightGBMBugModel":
        data = joblib.load(filepath)
        instance = cls(name=data["name"], params=data["params"])
        instance.model = data["model"]
        instance.feature_names = data["feature_names"]
        instance.is_trained = data["is_trained"]
        return instance
