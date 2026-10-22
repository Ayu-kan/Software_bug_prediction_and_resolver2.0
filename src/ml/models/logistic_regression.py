"""
src/ml/models/logistic_regression.py
------------------------------------
Logistic Regression classifier with balanced weights, standard scaling, and probability calibration.
"""

import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from src.ml.base import BaseBugModel


class LogisticRegressionBugModel(BaseBugModel):
    def __init__(self, name: str = "Logistic Regression", params: Optional[Dict[str, Any]] = None):
        default_params = {
            "class_weight": "balanced",
            "max_iter": 1000,
            "C": 1.0,
            "random_state": 42
        }
        if params:
            default_params.update(params)
        super().__init__(name=name, algorithm="Logistic Regression", params=default_params)
        self.scaler = StandardScaler()
        self.model = LogisticRegression(**self.params)

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
        coefs = np.abs(self.model.coef_[0])
        total = np.sum(coefs) or 1.0
        normalized = coefs / total
        return {f: float(round(w, 4)) for f, w in zip(self.feature_names, normalized)}

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
    def load(cls, filepath: str) -> "LogisticRegressionBugModel":
        data = joblib.load(filepath)
        instance = cls(name=data["name"], params=data["params"])
        instance.model = data["model"]
        instance.scaler = data["scaler"]
        instance.feature_names = data["feature_names"]
        instance.is_trained = data["is_trained"]
        return instance
