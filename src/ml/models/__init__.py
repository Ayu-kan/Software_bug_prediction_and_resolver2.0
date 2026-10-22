"""
src/ml/models/__init__.py
-------------------------
Registry of available ML algorithms for defect prediction.
"""

from src.ml.models.logistic_regression import LogisticRegressionBugModel
from src.ml.models.decision_tree import DecisionTreeBugModel
from src.ml.models.random_forest import RandomForestBugModel
from src.ml.models.svm import SVMBugModel
from src.ml.models.xgboost_model import XGBoostBugModel, XGB_AVAILABLE
from src.ml.models.lightgbm_model import LightGBMBugModel, LGBM_AVAILABLE

ALGORITHM_REGISTRY = {
    "logistic_regression": LogisticRegressionBugModel,
    "decision_tree": DecisionTreeBugModel,
    "random_forest": RandomForestBugModel,
    "svm": SVMBugModel,
    "xgboost": XGBoostBugModel,
    "lightgbm": LightGBMBugModel,
}

__all__ = [
    "LogisticRegressionBugModel",
    "DecisionTreeBugModel",
    "RandomForestBugModel",
    "SVMBugModel",
    "XGBoostBugModel",
    "LightGBMBugModel",
    "ALGORITHM_REGISTRY",
    "XGB_AVAILABLE",
    "LGBM_AVAILABLE",
]
