"""
src/ml/models/xgboost_model.py
------------------------------
XGBoost gradient boosting classifier with scale_pos_weight for imbalanced defect datasets.
"""

import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from src.ml.base import BaseBugModel

try:
    from xgboost import XGBClassifier
    XGB_AVAILABLE = True
except ImportError:
    XGB_AVAILABLE = False


class XGBoostBugModel(BaseBugModel):
    def __init__(self, name: str = "XGBoost", params: Optional[Dict[str, Any]] = None):
        default_params = {
            "n_estimators": 300,
            "max_depth": 4,
            "learning_rate": 0.05,
            "eval_metric": "logloss",
            "random_state": 42
        }
        if params:
            default_params.update(params)
        super().__init__(name=name, algorithm="XGBoost", params=default_params)
        if not XGB_AVAILABLE:
            self.model = None
        else:
            self.model = XGBClassifier(**self.params)

    def train(self, X: pd.DataFrame, y: pd.Series, feature_names: Optional[List[str]] = None) -> Dict[str, Any]:
        if not XGB_AVAILABLE:
            raise ImportError("xgboost package is not installed. Run: pip install xgboost")

        self.feature_names = feature_names or list(X.columns)
        X_df = X[self.feature_names].fillna(0).astype(float)
        y_arr = y.astype(int).to_numpy()

        pos_count = max(1, int(np.sum(y_arr == 1)))
        neg_count = max(1, len(y_arr) - pos_count)
        scale_pos_weight = float(neg_count / pos_count)

        self.params["scale_pos_weight"] = scale_pos_weight
        self.model = XGBClassifier(**self.params)
        self.model.fit(X_df, y_arr)
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
        return {f: float(round(w, 4)) for f, w in zip(self.feature_names, imps)}

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
    def load(cls, filepath: str) -> "XGBoostBugModel":
        data = joblib.load(filepath)
        instance = cls(name=data["name"], params=data["params"])
        instance.model = data["model"]
        instance.feature_names = data["feature_names"]
        instance.is_trained = data["is_trained"]
        return instance
