"""
src/ml/models/svm.py
--------------------
Support Vector Machine (SVC) classifier with probability calibration and feature scaling.
"""

import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from src.ml.base import BaseBugModel


class SVMBugModel(BaseBugModel):
    def __init__(self, name: str = "SVM", params: Optional[Dict[str, Any]] = None):
        default_params = {
            "kernel": "rbf",
            "C": 1.0,
            "probability": True,
            "class_weight": "balanced",
            "random_state": 42
        }
        if params:
            default_params.update(params)
        super().__init__(name=name, algorithm="SVM", params=default_params)
        self.scaler = StandardScaler()
        self.model = SVC(**self.params)

    def train(self, X: pd.DataFrame, y: pd.Series, feature_names: Optional[List[str]] = None) -> Dict[str, Any]:
        self.feature_names = feature_names or list(X.columns)
        X_df = X[self.feature_names].fillna(0).astype(float)
        X_scaled = self.scaler.fit_transform(X_df)
        self.model.fit(X_scaled, y.astype(int))
        self.is_trained = True
        return self.evaluate(X, y)

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        if not self.is_trained:
            raise RuntimeError("Model is not trained.")
        X_df = X[self.feature_names].fillna(0).astype(float)
        X_scaled = self.scaler.transform(X_df)
        return self.model.predict(X_scaled)

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        if not self.is_trained:
            raise RuntimeError("Model is not trained.")
        X_df = X[self.feature_names].fillna(0).astype(float)
        X_scaled = self.scaler.transform(X_df)
        return self.model.predict_proba(X_scaled)[:, 1]

    def get_feature_importances(self) -> Dict[str, float]:
        if not self.is_trained:
            return {}
        # Linear kernel provides coef_; for RBF kernel we use uniform baseline weights
        if self.params.get("kernel") == "linear" and hasattr(self.model, "coef_"):
            coefs = np.abs(self.model.coef_[0])
            total = np.sum(coefs) or 1.0
            return {f: float(round(w, 4)) for f, w in zip(self.feature_names, coefs / total)}
        else:
            n = len(self.feature_names) or 1
            return {f: float(round(1.0 / n, 4)) for f in self.feature_names}

    def save(self, filepath: str) -> None:
        payload = {
            "name": self.name,
            "algorithm": self.algorithm,
            "params": self.params,
            "model": self.model,
            "scaler": self.scaler,
            "feature_names": self.feature_names,
            "is_trained": self.is_trained
        }
        joblib.dump(payload, filepath)

    @classmethod
    def load(cls, filepath: str) -> "SVMBugModel":
        data = joblib.load(filepath)
        instance = cls(name=data["name"], params=data["params"])
        instance.model = data["model"]
        instance.scaler = data["scaler"]
        instance.feature_names = data["feature_names"]
        instance.is_trained = data["is_trained"]
        return instance
