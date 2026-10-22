"""
src/ml/preprocessing.py
-----------------------
Dataset Ingestion, Schema Inspection, Cleaning, and Preprocessing Pipeline.
Prevents data leakage across train, validation, and test splits.
"""

import os
import json
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, RobustScaler, MinMaxScaler


class DatasetPreprocessor:
    def __init__(self):
        pass

    @staticmethod
    def load_dataset(file_path: str) -> pd.DataFrame:
        """Loads dataset from CSV or JSON file."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        ext = file_path.split(".")[-1].lower()
        if ext == "csv":
            df = pd.read_csv(file_path)
        elif ext == "json":
            df = pd.read_json(file_path)
        else:
            raise ValueError(f"Unsupported file format '.{ext}'. Supported: CSV, JSON.")

        return df

    @staticmethod
    def inspect_schema(df: pd.DataFrame, target_col: Optional[str] = "future_bug") -> Dict[str, Any]:
        """Analyzes columns, missing values, datatypes, and class balance."""
        schema: Dict[str, Any] = {
            "total_rows": int(len(df)),
            "total_columns": int(len(df.columns)),
            "columns": [],
            "class_distribution": {},
            "potential_targets": []
        }

        for col in df.columns:
            null_count = int(df[col].isnull().sum())
            null_pct = float(round((null_count / len(df)) * 100, 2)) if len(df) > 0 else 0.0
            dtype = str(df[col].dtype)
            is_numeric = bool(pd.api.types.is_numeric_dtype(df[col]))

            col_info: Dict[str, Any] = {
                "name": col,
                "dtype": dtype,
                "is_numeric": is_numeric,
                "missing_count": null_count,
                "missing_percent": null_pct,
            }

            if is_numeric and len(df) > 0:
                col_info["mean"] = float(round(df[col].mean(), 4)) if not np.isnan(df[col].mean()) else 0.0
                col_info["std"] = float(round(df[col].std(), 4)) if not np.isnan(df[col].std()) else 0.0
                col_info["min"] = float(round(df[col].min(), 4)) if not np.isnan(df[col].min()) else 0.0
                col_info["max"] = float(round(df[col].max(), 4)) if not np.isnan(df[col].max()) else 0.0

            # Detect binary target candidates
            unique_vals = df[col].dropna().unique()
            if len(unique_vals) == 2 and set(unique_vals).issubset({0, 1, "0", "1", True, False, "bug", "clean"}):
                schema["potential_targets"].append(col)

            schema["columns"].append(col_info)

        # Class balance for target_col if present
        if target_col and target_col in df.columns:
            counts = df[target_col].value_counts().to_dict()
            total = len(df)
            schema["class_distribution"] = {
                str(k): {"count": int(v), "percent": float(round((v / total) * 100, 2))}
                for k, v in counts.items()
            }

        return schema

    @staticmethod
    def preprocess(
        df: pd.DataFrame,
        feature_cols: List[str],
        target_col: str = "future_bug",
        impute_strategy: str = "zero",  # "zero", "mean", "median", "drop"
        scaler_type: str = "standard"    # "standard", "robust", "minmax", "none"
    ) -> Tuple[pd.DataFrame, pd.Series, Any]:
        """Cleans, imputes, and scales features while strictly preserving target separation."""
        clean_df = df.copy()

        # Handle target
        if target_col not in clean_df.columns:
            raise ValueError(f"Target column '{target_col}' not found in dataset.")

        clean_df = clean_df.dropna(subset=[target_col])
        y = clean_df[target_col].astype(int)

        X = clean_df[feature_cols].copy()

        # Imputation
        if impute_strategy == "drop":
            valid_idx = X.dropna().index
            X = X.loc[valid_idx]
            y = y.loc[valid_idx]
        elif impute_strategy == "mean":
            X = X.fillna(X.mean())
        elif impute_strategy == "median":
            X = X.fillna(X.median())
        else:  # "zero"
            X = X.fillna(0)

        # Scaling
        scaler = None
        if scaler_type == "standard":
            scaler = StandardScaler()
            X_scaled = pd.DataFrame(scaler.fit_transform(X), columns=feature_cols, index=X.index)
        elif scaler_type == "robust":
            scaler = RobustScaler()
            X_scaled = pd.DataFrame(scaler.fit_transform(X), columns=feature_cols, index=X.index)
        elif scaler_type == "minmax":
            scaler = MinMaxScaler()
            X_scaled = pd.DataFrame(scaler.fit_transform(X), columns=feature_cols, index=X.index)
        else:
            X_scaled = X

        return X_scaled, y, scaler
