from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any

from backend.api.app import (
    RegisterRequest, LoginRequest, ConfigRequest, AnalysisRequest, ResolveRequest,
    TestConnectionRequest,
    handle_register, handle_login, handle_config, handle_analysis, handle_resolve,
    handle_test_connection
)

app = FastAPI(title="Enterprise Bug Risk Intelligence Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/auth/register")
def register(req: RegisterRequest):
    return handle_register(req)

@app.post("/auth/login")
def login(req: LoginRequest):
    return handle_login(req)

@app.post("/auth/config")
def config(req: ConfigRequest):
    return handle_config(req)

@app.post("/analysis/run")
def run_analysis(req: AnalysisRequest):
    return handle_analysis(req.repo_path, req.user_id, req.analysis_mode)

@app.post("/analysis/resolve")
def resolve_issue(req: ResolveRequest):
    return handle_resolve(req)

@app.post("/analysis/test-connection")
def test_connection(req: TestConnectionRequest):
    return handle_test_connection(req)

@app.get("/analysis/history/{user_id}")
def get_user_history(user_id: int):
    from backend.api.app import handle_get_user_history
    return handle_get_user_history(user_id)

@app.get("/analysis/details/{analysis_id}")
def get_analysis_details(analysis_id: int, user_id: int):
    from backend.api.app import handle_get_analysis_details
    return handle_get_analysis_details(analysis_id, user_id)

@app.delete("/analysis/delete/{analysis_id}")
def delete_analysis(analysis_id: int, user_id: int):
    from backend.api.app import handle_delete_analysis
    return handle_delete_analysis(analysis_id, user_id)

@app.get("/analysis/file-content")
def get_file_content(file_path: str, repo_path: Optional[str] = None):
    from backend.api.app import handle_get_file_content
    return handle_get_file_content(file_path, repo_path)

@app.get("/health")
def health_check():
    return {"status": "ok"}

