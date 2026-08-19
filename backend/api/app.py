"""
backend/api/app.py
------------------
FastAPI Application Backend providing clean API endpoints for Authentication,
Repository Analysis, File Ranking, Suspicious Line Detection, Code Preview, and LLM Issue Resolution.
"""

import os
import sys
import json
import joblib
import pandas as pd
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

# Add workspace path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))

from backend.database.db import (
    init_db, get_db, save_analysis_record, get_latest_user_analysis,
    get_user_analyses_list, get_analysis_by_id, delete_user_analysis, save_ai_solution
)
from backend.auth.auth_service import register_user, login_user, update_user_llm_config, get_user_llm_config
from backend.auth.security import verify_access_token
from backend.services.ranking_service import rank_files, get_top_10_risky_files, filter_hybrid_mode
from backend.services.suspicious_line_service import analyze_suspicious_lines
from backend.services.llm_service import LLMSolutionEngine
from repo.validator import validate_repo_input, TemporaryClone
from extract_features import extract

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "models")

init_db()

def load_ml_model():
    for name, fname, needs_scaler in [
        ("XGBoost", "xgboost.joblib", False),
        ("Random Forest", "random_forest.joblib", False),
        ("Logistic Regression", "logistic_regression.joblib", True),
    ]:
        path = os.path.join(MODELS_DIR, fname)
        if os.path.exists(path):
            model = joblib.load(path)
            scaler = joblib.load(os.path.join(MODELS_DIR, "scaler.joblib")) if needs_scaler else None
            return name, model, scaler
    return None, None, None

# Pydantic Schemas
class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

class ConfigRequest(BaseModel):
    user_id: int
    provider: str
    api_key: str

class AnalysisRequest(BaseModel):
    repo_path: str
    user_id: int
    analysis_mode: Optional[str] = "Normal Mode (All Files)"

class PreviewRequest(BaseModel):
    file_path: str
    source_code: Optional[str] = ""

class ResolveRequest(BaseModel):
    file_path: str
    source_code: Optional[str] = ""
    risk_factors: Optional[str] = ""
    ml_probability: float = 0.5
    user_id: int
    row_data: Optional[Dict[str, Any]] = None

# Handler logic for direct usage or FastAPI server
def handle_register(req: RegisterRequest):
    return register_user(req.username, req.email, req.password)

def handle_login(req: LoginRequest):
    return login_user(req.username, req.password)

def handle_config(req: ConfigRequest):
    return update_user_llm_config(req.user_id, req.provider, req.api_key)

def handle_analysis(repo_path: str, user_id: int, analysis_mode: str = "Normal Mode (All Files)"):
    is_valid, err_msg, meta = validate_repo_input(repo_path)
    if not is_valid:
        return {"success": False, "error": err_msg}

    model_name, model, scaler = load_ml_model()
    if not model:
        return {"success": False, "error": "No trained ML model found in models directory."}

    try:
        feature_cols = json.load(open(os.path.join(MODELS_DIR, "feature_columns.json")))
    except Exception:
        feature_cols = ["loc", "complexity", "function_count", "avg_function_size", 
                        "max_function_size", "dependency_count", "commit_count", 
                        "developer_count", "lines_added", "lines_deleted", 
                        "code_churn", "recent_commit_count", "days_since_last_change", 
                        "previous_bug_count"]

    tmp_csv = os.path.join(os.path.dirname(__file__), "..", "..", f"_backend_tmp_{user_id}.csv")
    try:
        if meta.get("is_url"):
            with TemporaryClone(repo_path) as clone_dir:
                extract(clone_dir, tmp_csv, cutoff_ratio=1.0)
        else:
            extract(repo_path, tmp_csv, cutoff_ratio=1.0)

        df = pd.read_csv(tmp_csv)
        missing_cols = [c for c in feature_cols if c not in df.columns]
        for c in missing_cols:
            df[c] = 0

        X = df[feature_cols].fillna(0)
        X_input = scaler.transform(X) if scaler is not None else X

        ml_probs = model.predict_proba(X_input)[:, 1] if hasattr(model, "predict_proba") else [0.5]*len(df)
        df["ml_probability"] = ml_probs

        dep_risk = df.get("dependency_risk", 0) / 100.0
        
        # Calculate dynamic architecture risk score based on role & path importance
        arch_risk_raw = df.get("architecture_risk", 10.0) / 100.0

        # Dynamic risk score calculation combining ML prediction, static complexity, churn/history, and architecture role
        df["hybrid_risk_score"] = (
            0.70 * df["ml_probability"] +
            0.15 * dep_risk +
            0.15 * arch_risk_raw
        )
        df["risk_%"] = (df["hybrid_risk_score"] * 100).round(1)

        def compute_risk_cause(row):
            causes = []
            comp = row.get("complexity", 0)
            bugs = row.get("previous_bug_count", 0)
            loc = row.get("loc", 0)
            dep = row.get("dependency_risk", 0)
            arch_role = row.get("architecture_role", "")
            
            if comp > 20 or loc > 250:
                causes.append(f"High code complexity (LOC: {loc}, Complexity: {comp})")
            if bugs > 0:
                causes.append(f"Historical bugs ({bugs})")
            if dep > 50:
                causes.append(f"High dependency coupling (Fan-in: {row.get('fan_in', 0)})")
            if "Authentication" in arch_role or "Security" in arch_role:
                causes.append("Critical Auth/Security component")
            elif "Database" in arch_role:
                causes.append("Critical Database component")
                
            return " | ".join(causes) if causes else "Low complexity, clean history & low coupling"

        df["risk_cause_description"] = df.apply(compute_risk_cause, axis=1)

        records = df.to_dict(orient="records")

        # Line analysis for each file
        for r in records:
            source = r.get("last_source_code", "")
            suspicious = analyze_suspicious_lines(r["file"], source, r)
            r["suspicious_lines"] = suspicious
            r["suspicious_count"] = len(suspicious)

        # Ranked & Top 10
        ranked_all = rank_files(records)
        top_10 = get_top_10_risky_files(records)
        hybrid_filtered = filter_hybrid_mode(records, threshold=0.60)
        high_risk_cnt = sum(1 for r in ranked_all if r.get("ml_probability", 0) >= 0.70)

        result_payload = {
            "success": True,
            "repo_name": os.path.basename(repo_path.rstrip("/\\")) or repo_path,
            "repo_path": repo_path,
            "total_files": len(ranked_all),
            "high_risk_count": high_risk_cnt,
            "all_ranked_files": ranked_all,
            "top_10_files": top_10,
            "hybrid_mode_files": hybrid_filtered
        }

        # Save to database bound to user_id
        analysis_id = save_analysis_record(
            user_id=user_id,
            repo_name=result_payload["repo_name"],
            total_files=len(ranked_all),
            high_risk_count=high_risk_cnt,
            analysis_mode=analysis_mode,
            full_results_json=json.dumps(result_payload)
        )
        result_payload["analysis_id"] = analysis_id

        return result_payload
    finally:
        if os.path.exists(tmp_csv):
            try:
                os.remove(tmp_csv)
            except Exception:
                pass

def handle_get_latest_analysis(user_id: int):
    record = get_latest_user_analysis(user_id)
    if not record:
        return {"success": False, "message": "No analysis found for this user."}
    try:
        data = json.loads(record["full_results_json"])
        data["analysis_id"] = record["id"]
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e)}

def handle_get_user_history(user_id: int):
    rows = get_user_analyses_list(user_id)
    return {"success": True, "history": rows}

def handle_get_analysis_details(analysis_id: int, user_id: int):
    record = get_analysis_by_id(analysis_id, user_id)
    if not record:
        return {"success": False, "error": "Analysis record not found or access denied."}
    try:
        data = json.loads(record["full_results_json"])
        data["analysis_id"] = record["id"]
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e)}

def handle_delete_analysis(analysis_id: int, user_id: int):
    success = delete_user_analysis(analysis_id, user_id)
    if success:
        return {"success": True, "message": "Analysis deleted."}
    return {"success": False, "error": "Failed to delete analysis or access denied."}

def handle_resolve(req: ResolveRequest):
    config = get_user_llm_config(req.user_id) if req.user_id else {"llm_provider": "openai", "llm_api_key": ""}
    llm = LLMSolutionEngine(api_key=config.get("llm_api_key"), provider=config.get("llm_provider"))
    solution = llm.generate_solution(
        file_path=req.file_path,
        source_code=req.source_code,
        risk_factors=req.risk_factors,
        ml_probability=req.ml_probability,
        row_data=req.row_data or {}
    )
    save_ai_solution(user_id=req.user_id, file_path=req.file_path, generated_solution=solution)
    return {"success": True, "solution": solution}
