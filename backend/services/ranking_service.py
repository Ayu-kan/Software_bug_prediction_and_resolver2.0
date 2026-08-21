"""
backend/services/ranking_service.py
------------------------------------
Service for sorting, ranking, and filtering repository analysis results.
"""

def rank_files(df_records: list) -> list:
    """
    Sorts files by ML bug probability in descending order and adds rank metadata.
    """
    # Sort by ml_probability or hybrid_risk_score
    sorted_files = sorted(
        df_records,
        key=lambda x: x.get("ml_probability", x.get("hybrid_risk_score", 0)),
        reverse=True
    )
    
    for idx, item in enumerate(sorted_files, 1):
        item["rank"] = idx
        # Calculate risk level using calibrated probability
        prob = item.get("ml_probability", 0) * 100
        if prob >= 80:
            item["risk_level"] = "Critical"
        elif prob >= 65:
            item["risk_level"] = "High"
        elif prob >= 40:
            item["risk_level"] = "Medium"
        else:
            item["risk_level"] = "Low"
            
    return sorted_files

def get_top_10_risky_files(df_records: list) -> list:
    """
    Returns top 10 highest-risk files based on ML bug probability.
    """
    ranked = rank_files(df_records)
    return ranked[:10]

def filter_hybrid_mode(df_records: list, threshold: float = 0.65) -> list:
    """
    Filters files for Hybrid Mode: keeps only files with ML bug probability > threshold (65%).
    Threshold raised from 60% to reduce false positives after calibration.
    """
    ranked = rank_files(df_records)
    filtered = [
        item for item in ranked 
        if item.get("ml_probability", item.get("hybrid_risk_score", 0)) > threshold
    ]
    return filtered
