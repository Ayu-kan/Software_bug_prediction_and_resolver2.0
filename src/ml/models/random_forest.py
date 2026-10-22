"""
src/ml/models/random_forest.py
------------------------------
Random Forest ensemble classifier with out-of-bag scoring and balanced class weights.
"""

import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional
from sklearn.ensemble import RandomForestClassifier
from src.ml.base import BaseBugModel


class RandomForestBugModel(BaseBugModel):
    def __init__(self, name: str = "Random Forest", params: Optional[Dict[str, Any]] = None):
        default_params = {
            "n_estimators": 300,
            "max_depth": 8,
            "min_samples_split": 4,
            "min_samples_leaf": 2,
            "class_weight": "balanced",
            "random_state": 42,
            "n_jobs": -1
        }
        if params:
            default_params.update(params)
        super().__init__(name=name, algorithm="Random Forest", params=default_params)
        self.model = RandomForestClassifier(**self.params)

    def train(self, X: pd.DataFrame, y: pd.Series, feature_names: Optional[List[str]] = None) -> Dict[str, Any]:
        self.feature_names = feature_names or list(X.columns)
        X_df = X[self.feature_names].fillna(0).astype(float)
        self.model.fit(X_df, y.astype(int))
        self.is_trained = True
        return self.evaluate(X, y)

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        if not self.is_trained:
            raise RuntimeError("Model is not trained.")
        X_df = X[self.feature_names].fillna(0).astype(float)
        return self.model.predict(X_df)

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        if not self.is_trained:
            raise RuntimeError("Model is not trained.")
        X_df = X[self.feature_names].fillna(0).astype(float)
        return self.model.predict_proba(X_df)[:, 1]

    def get_feature_importances(self) -> Dict[str, float]:
        if not self.is_trained:
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
    def load(cls, filepath: str) -> "RandomForestBugModel":
        data = joblib.load(filepath)
        instance = cls(name=data["name"], params=data["params"])
        instance.model = data["model"]
        instance.feature_names = data["feature_names"]
        instance.is_trained = data["is_trained"]
        return instance
