"""
backend/api/app.py
------------------
FastAPI Application Backend providing clean API endpoints for:
- Authentication & Multi-Provider API Key Session Management
- Collaborative Workspaces with RBAC (Admin, Editor, Viewer)
- Live Workspace Activity Auditing & Synchronized Analyses
- Repository Risk Analysis, File Ranking & AST Line Flagging
- Full Source Code Inspection & Monaco Syntax Preview
- User API Key-isolated LLM Bug Resolution & Solution History
"""

import os
import sys
import json
import joblib
import pandas as pd
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from fastapi import FastAPI

# Add workspace path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "src"))

from backend.database.db import (
    init_db, get_db, save_analysis_record, get_latest_user_analysis,
    get_user_analyses_list, get_analysis_by_id, delete_user_analysis,
    save_ai_solution, get_analysis_solutions,
    create_workspace, get_user_workspaces, get_workspace_details,
    get_user_role_in_workspace, add_workspace_member, update_member_role,
    remove_workspace_member, log_workspace_activity, get_workspace_activities
)
from backend.auth.auth_service import (
    register_user, login_user, update_user_llm_config, get_user_llm_config,
    find_user_by_query
)
from backend.auth.security import verify_access_token
from backend.services.ranking_service import rank_files, get_top_10_risky_files, filter_hybrid_mode
from backend.services.suspicious_line_service import analyze_suspicious_lines
from backend.services.llm_service import LLMSolutionEngine
from repo.validator import validate_repo_input, TemporaryClone
from extract_features import extract

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "models")

# Ensure DB initialized
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

# ----------------- Pydantic Request Schemas -----------------

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
    all_keys: Optional[Dict[str, str]] = None

class CreateWorkspaceRequest(BaseModel):
    name: str
    description: Optional[str] = ""
    owner_id: int

class InviteMemberRequest(BaseModel):
    workspace_id: int
    invited_by: int
    query: str  # username or email
    role: Optional[str] = "editor"

class UpdateRoleRequest(BaseModel):
    workspace_id: int
    actor_id: int
    target_user_id: int
    new_role: str

class RemoveMemberRequest(BaseModel):
    workspace_id: int
    actor_id: int
    target_user_id: int

class AnalysisRequest(BaseModel):
    repo_path: str
    user_id: int
    workspace_id: Optional[int] = None
    analysis_mode: Optional[str] = "Normal Mode (All Files)"

class ResolveRequest(BaseModel):
    file_path: str
    source_code: Optional[str] = ""
    risk_factors: Optional[str] = ""
    ml_probability: float = 0.5
    user_id: int
    workspace_id: Optional[int] = None
    analysis_id: Optional[int] = None
    row_data: Optional[Dict[str, Any]] = None

class TestConnectionRequest(BaseModel):
    provider: str
    api_key: str
    model: Optional[str] = None
    user_id: Optional[int] = None

# ----------------- Auth & Config Handlers -----------------

def handle_register(req: RegisterRequest):
    return register_user(req.username, req.email, req.password)

def handle_login(req: LoginRequest):
    return login_user(req.username, req.password)

def handle_config(req: ConfigRequest):
    return update_user_llm_config(req.user_id, req.provider, req.api_key, req.all_keys)

def handle_get_config(user_id: int):
    return get_user_llm_config(user_id, masked=True)

# ----------------- Workspace & RBAC Handlers -----------------

def handle_create_workspace(req: CreateWorkspaceRequest):
    if not req.name.strip():
        return {"success": False, "error": "Workspace name cannot be empty."}
    ws = create_workspace(req.name.strip(), req.owner_id, req.description or "")
    return {"success": True, "workspace": ws}

def handle_get_user_workspaces(user_id: int):
    workspaces = get_user_workspaces(user_id)
    return {"success": True, "workspaces": workspaces}

def handle_get_workspace_details(workspace_id: int, user_id: int):
    ws = get_workspace_details(workspace_id, user_id)
    if not ws:
        return {"success": False, "error": "Workspace not found or access denied."}
    activities = get_workspace_activities(workspace_id, limit=20)
    ws["activities"] = activities
    return {"success": True, "workspace": ws}

def handle_invite_member(req: InviteMemberRequest):
    actor_role = get_user_role_in_workspace(req.workspace_id, req.invited_by)
    if actor_role != "admin":
        return {"success": False, "error": "Only workspace Admins can invite team members."}
        
    target_user = find_user_by_query(req.query)
    if not target_user:
        return {"success": False, "error": f"No registered user found with username or email '{req.query}'."}
        
    role = req.role if req.role in ["admin", "editor", "viewer"] else "editor"
    success = add_workspace_member(req.workspace_id, target_user["id"], role, actor_id=req.invited_by)
    if success:
        return {
            "success": True,
            "message": f"Added {target_user['username']} to workspace as {role.capitalize()}.",
            "member": {"user_id": target_user["id"], "username": target_user["username"], "role": role}
        }
    return {"success": False, "error": "Failed to add member to workspace."}

def handle_update_member_role(req: UpdateRoleRequest):
    actor_role = get_user_role_in_workspace(req.workspace_id, req.actor_id)
    if actor_role != "admin":
        return {"success": False, "error": "Only workspace Admins can change member roles."}
    if req.new_role not in ["admin", "editor", "viewer"]:
        return {"success": False, "error": "Invalid role specified."}
        
    success = update_member_role(req.workspace_id, req.target_user_id, req.new_role, req.actor_id)
    if success:
        return {"success": True, "message": "Role updated successfully."}
    return {"success": False, "error": "Failed to update member role."}

def handle_remove_member(req: RemoveMemberRequest):
    actor_role = get_user_role_in_workspace(req.workspace_id, req.actor_id)
    if actor_role != "admin" and req.actor_id != req.target_user_id:
        return {"success": False, "error": "Only workspace Admins can remove team members."}
        
    success = remove_workspace_member(req.workspace_id, req.target_user_id, req.actor_id)
    if success:
        return {"success": True, "message": "Member removed from workspace."}
    return {"success": False, "error": "Failed to remove member."}

def handle_get_workspace_activities(workspace_id: int):
    activities = get_workspace_activities(workspace_id)
    return {"success": True, "activities": activities}

# ----------------- Analysis Handlers -----------------

def handle_analysis(repo_path: str, user_id: int, workspace_id: Optional[int] = None, analysis_mode: str = "Normal Mode (All Files)"):
    if workspace_id:
        role = get_user_role_in_workspace(workspace_id, user_id)
        if not role:
            return {"success": False, "error": "Access denied. You are not a member of this workspace."}
        if role == "viewer":
            return {"success": False, "error": "Permission denied. Viewers cannot trigger new analyses in this workspace."}

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

        import numpy as np
        raw = df["ml_probability"].values.copy()
        p_min = float(np.percentile(raw, 5))
        p_max = float(np.percentile(raw, 95))
        if p_max > p_min:
            normalized = (raw - p_min) / (p_max - p_min)
            calibrated = 0.05 + normalized * 0.80
            calibrated = np.clip(calibrated, 0.0, 1.0)
            df["ml_probability"] = calibrated

        dep_risk = df.get("dependency_risk", 0) / 100.0
        arch_risk_raw = df.get("architecture_risk", 10.0) / 100.0

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
            churn = row.get("code_churn", 0)
            developer_count = row.get("developer_count", 0)
            
            if comp > 40 and loc > 500:
                causes.append(f"Very high code complexity (LOC: {loc}, Complexity: {comp})")
            elif comp > 25 or loc > 350:
                causes.append(f"Elevated code complexity (LOC: {loc}, Complexity: {comp})")
            if bugs > 2:
                causes.append(f"Repeated historical bugs ({bugs} recorded)")
            elif bugs > 0:
                causes.append(f"Historical bug record ({bugs})")
            if dep > 70:
                causes.append(f"Very high dependency coupling (Fan-in: {row.get('fan_in', 0)})")
            elif dep > 50:
                causes.append(f"Moderate dependency coupling (Fan-in: {row.get('fan_in', 0)})")
            if churn > 1000:
                causes.append(f"High code churn ({int(churn)} lines modified)")
            if developer_count > 5:
                causes.append(f"Many contributors ({int(developer_count)} devs) increases merge risk")
            if "Authentication" in arch_role or "Security" in arch_role:
                causes.append("Critical Auth/Security component")
            elif "Database" in arch_role:
                causes.append("Critical Database component")
                
            return " | ".join(causes) if causes else "Clean structure, low complexity & clean bug history"

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
        high_risk_cnt = sum(1 for r in ranked_all if r.get("ml_probability", 0) >= 0.75)

        repo_name = os.path.basename(repo_path.rstrip("/\\")) or repo_path

        result_payload = {
            "success": True,
            "repo_name": repo_name,
            "repo_path": repo_path,
            "total_files": len(ranked_all),
            "high_risk_count": high_risk_cnt,
            "all_ranked_files": ranked_all,
            "top_10_files": top_10,
            "hybrid_mode_files": hybrid_filtered,
            "workspace_id": workspace_id
        }

        # Save to database bound to user_id and workspace_id
        analysis_id = save_analysis_record(
            user_id=user_id,
            repo_name=repo_name,
            total_files=len(ranked_all),
            high_risk_count=high_risk_cnt,
            analysis_mode=analysis_mode,
            full_results_json=json.dumps(result_payload),
            workspace_id=workspace_id
        )
        result_payload["analysis_id"] = analysis_id

        # Log workspace activity if executed in workspace
        if workspace_id:
            conn = get_db()
            cursor = conn.cursor()
            cursor.execute("SELECT username FROM users WHERE id = ?", (user_id,))
            u_row = cursor.fetchone()
            uname = u_row["username"] if u_row else "Team Member"
            conn.close()
            log_workspace_activity(
                workspace_id=workspace_id,
                user_id=user_id,
                username=uname,
                action_type="analysis_run",
                description=f"Ran {analysis_mode} on '{repo_name}' ({len(ranked_all)} files, {high_risk_cnt} high risk)"
            )

        return result_payload
    finally:
        if os.path.exists(tmp_csv):
            try:
                os.remove(tmp_csv)
            except Exception:
                pass

def handle_get_latest_analysis(user_id: int, workspace_id: Optional[int] = None):
    record = get_latest_user_analysis(user_id, workspace_id)
    if not record:
        return {"success": False, "message": "No analysis found."}
    try:
        data = json.loads(record["full_results_json"])
        data["analysis_id"] = record["id"]
        data["created_at"] = record.get("created_at")
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e)}

def handle_get_user_history(user_id: int, workspace_id: Optional[int] = None):
    rows = get_user_analyses_list(user_id, workspace_id)
    return {"success": True, "history": rows}

def handle_get_analysis_details(analysis_id: int, user_id: int, workspace_id: Optional[int] = None):
    record = get_analysis_by_id(analysis_id, user_id, workspace_id)
    if not record:
        return {"success": False, "error": "Analysis record not found or access denied."}
    try:
        data = json.loads(record["full_results_json"])
        data["analysis_id"] = record["id"]
        data["created_at"] = record.get("created_at")
        return {"success": True, "data": data}
    except Exception as e:
        return {"success": False, "error": str(e)}

def handle_delete_analysis(analysis_id: int, user_id: int):
    success = delete_user_analysis(analysis_id, user_id)
    if success:
        return {"success": True, "message": "Analysis deleted."}
    return {"success": False, "error": "Failed to delete analysis or access denied."}

def handle_resolve(req: ResolveRequest):
    if req.workspace_id:
        role = get_user_role_in_workspace(req.workspace_id, req.user_id)
        if not role:
            return {"success": False, "error": "access_denied", "message": "You are not a member of this collaborative workspace."}
        if role == "viewer":
            return {"success": False, "error": "permission_denied", "message": "Viewers have read-only access and cannot generate AI fixes."}

    config = get_user_llm_config(req.user_id, masked=False) if req.user_id else {"llm_provider": "openai", "llm_api_key": ""}
    api_key = (config.get("llm_api_key") or "").strip()
    provider = config.get("llm_provider", "openai")

    if not api_key:
        return {
            "success": False,
            "error": "api_key_required",
            "message": f"No API key configured for {provider.capitalize()}. Please add your API key in Settings to use AI Fix."
        }

    llm = LLMSolutionEngine(api_key=api_key, provider=provider)
    solution = llm.generate_solution(
        file_path=req.file_path,
        source_code=req.source_code,
        risk_factors=req.risk_factors,
        ml_probability=req.ml_probability,
        row_data=req.row_data or {}
    )

    if solution.get("error"):
        return {"success": False, "error": solution["error"], "message": solution.get("message", "AI generation failed.")}

    save_ai_solution(
        user_id=req.user_id,
        file_path=req.file_path,
        generated_solution=solution,
        analysis_id=req.analysis_id,
        workspace_id=req.workspace_id
    )

    if req.workspace_id:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT username FROM users WHERE id = ?", (req.user_id,))
        u_row = cursor.fetchone()
        uname = u_row["username"] if u_row else "Team Member"
        conn.close()
        fname = req.file_path.split("/")[-1].split("\\")[-1]
        log_workspace_activity(
            workspace_id=req.workspace_id,
            user_id=req.user_id,
            username=uname,
            action_type="ai_fix_generated",
            description=f"Generated AI bug fix for '{fname}' using {provider.capitalize()}"
        )

    return {"success": True, "solution": solution}

def handle_get_solutions(analysis_id: Optional[int] = None, file_path: Optional[str] = None, workspace_id: Optional[int] = None, user_id: Optional[int] = None):
    solutions = get_analysis_solutions(analysis_id, file_path, workspace_id, user_id)
    return {"success": True, "solutions": solutions}

def handle_test_connection(req: TestConnectionRequest):
    api_key = (req.api_key or "").strip()
    if (not api_key or api_key.startswith("••") or api_key == "••••••••") and req.user_id:
        cfg = get_user_llm_config(req.user_id, masked=False)
        keys_map = cfg.get("keys", {})
        api_key = keys_map.get(req.provider) or (cfg.get("llm_api_key") if cfg.get("llm_provider") == req.provider else "")
        api_key = (api_key or "").strip()

    if not api_key:
        return {"success": False, "error": "api_key_required", "message": "No API key provided. Please enter a valid API key."}
    llm = LLMSolutionEngine(api_key=api_key, provider=req.provider, model=req.model)
    return llm.test_connection()

def handle_get_file_content(file_path: str, repo_path: Optional[str] = None):
    try:
        clean_file = file_path.strip().replace("\\", "/")
        candidates = [clean_file]
        
        if repo_path:
            clean_repo = repo_path.strip().replace("\\", "/")
            candidates.append(os.path.join(clean_repo, clean_file))
            candidates.append(os.path.join(clean_repo, clean_file.lstrip("/")))
            
        workspace_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        candidates.append(os.path.join(workspace_root, clean_file.lstrip("/")))

        for path_cand in candidates:
            norm_cand = os.path.abspath(os.path.normpath(path_cand))
            if os.path.exists(norm_cand) and os.path.isfile(norm_cand):
                with open(norm_cand, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                return {"success": True, "content": content, "path": norm_cand}
                
        return {"success": False, "error": f"File not found at path: {file_path}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

app = FastAPI()