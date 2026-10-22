"""
backend/main.py
----------------
FastAPI entrypoint exposing routes for:
- Authentication & Multi-Provider API Key Config
- Collaborative Workspaces with RBAC (Admin, Editor, Viewer)
- WebSocket Connection for Real-Time Workspace Activity Sync
- Repository Analysis, Suspicious Line Flagging & Code Content Fetching
- AI Solutions Generation & Historical Retrieval
"""

import json
from typing import Optional, Dict, Any, List, Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, Depends, Request, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.api.app import (
    RegisterRequest, LoginRequest, RefreshTokenRequest, LogoutRequest, ConfigRequest, AnalysisRequest, ResolveRequest,
    TestConnectionRequest, FeedbackRequest, CreateWorkspaceRequest, InviteMemberRequest,
    RespondInviteRequest, UpdateRoleRequest, RemoveMemberRequest,
    TrainModelRequest, CompareModelsRequest, SetActiveModelRequest,
    CandidateRepairRequest, VerifyRepairRequest, ApplyPatchRequest,
    handle_register, handle_login, handle_refresh, handle_logout, handle_config, handle_get_config,
    handle_create_workspace, handle_get_user_workspaces, handle_get_workspace_details,
    handle_invite_member, handle_get_user_invitations, handle_respond_invitation,
    handle_get_workspace_invitations, handle_cancel_invitation,
    handle_update_member_role, handle_remove_member,
    handle_get_workspace_activities, handle_analysis, handle_get_latest_analysis,
    handle_get_user_history, handle_get_analysis_details, handle_delete_analysis,
    handle_resolve, handle_get_solutions, handle_test_connection, handle_get_file_content,
    handle_submit_feedback, handle_model_status, handle_model_history, handle_retrain,
    handle_list_models, handle_train_model, handle_compare_models, handle_set_active_model,
    handle_save_uploaded_dataset, handle_list_datasets, handle_preview_dataset, handle_delete_dataset,
    handle_generate_candidate_repair, handle_verify_candidate_repair, handle_apply_repair_patch,
    handle_rollback_repair_patch, handle_get_repair_history
)

from backend.database.db import init_db
from backend.auth.security import get_current_user, get_optional_current_user

app = FastAPI(title="Enterprise Bug Risk Intelligence Platform API (v2.0)")

@app.on_event("startup")
def on_startup():
    init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Real-Time WebSocket Manager -----------------

class ConnectionManager:
    def __init__(self):
        self.active_workspaces: Dict[int, Set[WebSocket]] = {}

    async def connect(self, workspace_id: int, websocket: WebSocket):
        await websocket.accept()
        if workspace_id not in self.active_workspaces:
            self.active_workspaces[workspace_id] = set()
        self.active_workspaces[workspace_id].add(websocket)

    def disconnect(self, workspace_id: int, websocket: WebSocket):
        if workspace_id in self.active_workspaces:
            self.active_workspaces[workspace_id].discard(websocket)
            if not self.active_workspaces[workspace_id]:
                del self.active_workspaces[workspace_id]

    async def broadcast_to_workspace(self, workspace_id: int, message: dict):
        if workspace_id in self.active_workspaces:
            dead_sockets = set()
            for connection in self.active_workspaces[workspace_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    dead_sockets.add(connection)
            for dead in dead_sockets:
                self.active_workspaces[workspace_id].discard(dead)

ws_manager = ConnectionManager()

@app.websocket("/ws/workspace/{workspace_id}")
async def workspace_websocket_endpoint(websocket: WebSocket, workspace_id: int):
    await ws_manager.connect(workspace_id, websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg_json = json.loads(data)
                await ws_manager.broadcast_to_workspace(workspace_id, msg_json)
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(workspace_id, websocket)

# ----------------- Auth Routes -----------------

@app.post("/auth/register")
def register(req: RegisterRequest):
    return handle_register(req)

@app.post("/auth/login")
def login(req: LoginRequest, request: Request):
    client_ip = request.client.host if request.client else "127.0.0.1"
    return handle_login(req, client_ip)

@app.post("/auth/refresh")
def refresh_token_endpoint(req: RefreshTokenRequest):
    return handle_refresh(req)

@app.post("/auth/logout")
def logout_endpoint(req: LogoutRequest):
    return handle_logout(req)

@app.post("/auth/config")
def config(req: ConfigRequest, current_user: dict = Depends(get_current_user)):
    req.user_id = current_user["user_id"]
    return handle_config(req)

@app.get("/auth/config/{user_id}")
def get_config(user_id: int, current_user: dict = Depends(get_current_user)):
    return handle_get_config(current_user["user_id"])

# ----------------- Workspace & RBAC Routes -----------------

@app.post("/workspaces/create")
def create_workspace_endpoint(req: CreateWorkspaceRequest, current_user: dict = Depends(get_current_user)):
    req.owner_id = current_user["user_id"]
    return handle_create_workspace(req)

@app.get("/workspaces/user/{user_id}")
def get_user_workspaces_endpoint(user_id: int, current_user: dict = Depends(get_current_user)):
    return handle_get_user_workspaces(current_user["user_id"])

@app.get("/workspaces/{workspace_id}")
def get_workspace_details_endpoint(workspace_id: int, current_user: dict = Depends(get_current_user)):
    return handle_get_workspace_details(workspace_id, current_user["user_id"])

@app.post("/workspaces/invite")
async def invite_member_endpoint(req: InviteMemberRequest, current_user: dict = Depends(get_current_user)):
    req.invited_by = current_user["user_id"]
    res = handle_invite_member(req)
    if res.get("success"):
        await ws_manager.broadcast_to_workspace(
            req.workspace_id,
            {"type": "invite_created", "data": res.get("invite"), "message": res.get("message")}
        )
    return res

@app.get("/workspaces/invitations/{user_id}")
def get_user_invitations_endpoint(user_id: int, current_user: dict = Depends(get_current_user)):
    return handle_get_user_invitations(current_user["user_id"])

@app.post("/workspaces/invitations/{invite_id}/respond")
async def respond_invitation_endpoint(invite_id: int, req: RespondInviteRequest, current_user: dict = Depends(get_current_user)):
    req.user_id = current_user["user_id"]
    res = handle_respond_invitation(invite_id, req)
    if res.get("success") and res.get("workspace_id"):
        await ws_manager.broadcast_to_workspace(
            res["workspace_id"],
            {"type": "invite_resolved", "invite_id": invite_id, "action": req.action, "message": res.get("message")}
        )
    return res

@app.get("/workspaces/{workspace_id}/invitations")
def get_workspace_invitations_endpoint(workspace_id: int, current_user: dict = Depends(get_current_user)):
    return handle_get_workspace_invitations(workspace_id, current_user["user_id"])

@app.delete("/workspaces/invitations/{invite_id}")
async def cancel_invitation_endpoint(invite_id: int, current_user: dict = Depends(get_current_user)):
    return handle_cancel_invitation(invite_id, current_user["user_id"])

@app.post("/workspaces/update-role")
async def update_member_role_endpoint(req: UpdateRoleRequest, current_user: dict = Depends(get_current_user)):
    req.actor_id = current_user["user_id"]
    res = handle_update_member_role(req)
    if res.get("success"):
        await ws_manager.broadcast_to_workspace(
            req.workspace_id,
            {"type": "role_updated", "target_user_id": req.target_user_id, "new_role": req.new_role}
        )
    return res

@app.post("/workspaces/remove-member")
async def remove_member_endpoint(req: RemoveMemberRequest, current_user: dict = Depends(get_current_user)):
    req.actor_id = current_user["user_id"]
    res = handle_remove_member(req)
    if res.get("success"):
        await ws_manager.broadcast_to_workspace(
            req.workspace_id,
            {"type": "member_removed", "target_user_id": req.target_user_id}
        )
    return res

@app.get("/workspaces/{workspace_id}/activities")
def get_workspace_activities_endpoint(workspace_id: int, current_user: dict = Depends(get_current_user)):
    return handle_get_workspace_activities(workspace_id)

# ----------------- Analysis & History Routes -----------------

@app.post("/analysis/run")
async def run_analysis(req: AnalysisRequest, current_user: dict = Depends(get_current_user)):
    req.user_id = current_user["user_id"]
    res = handle_analysis(req.repo_path, req.user_id, req.workspace_id, req.analysis_mode or "Normal Mode (All Files)", model_name=req.model_name)
    if res.get("success") and req.workspace_id:
        await ws_manager.broadcast_to_workspace(
            req.workspace_id,
            {
                "type": "analysis_completed",
                "repo_name": res.get("repo_name"),
                "total_files": res.get("total_files"),
                "high_risk_count": res.get("high_risk_count"),
                "analysis_id": res.get("analysis_id"),
                "user_id": req.user_id
            }
        )
    return res

@app.post("/analysis/resolve")
async def resolve_issue(req: ResolveRequest, current_user: dict = Depends(get_current_user)):
    req.user_id = current_user["user_id"]
    res = handle_resolve(req)
    if res.get("success") and req.workspace_id:
        await ws_manager.broadcast_to_workspace(
            req.workspace_id,
            {
                "type": "solution_generated",
                "file_path": req.file_path,
                "analysis_id": req.analysis_id,
                "user_id": req.user_id
            }
        )
    return res

@app.get("/analysis/solutions")
def get_solutions(
    analysis_id: Optional[int] = None,
    file_path: Optional[str] = None,
    workspace_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    return handle_get_solutions(analysis_id, file_path, workspace_id, current_user["user_id"])

@app.post("/analysis/test-connection")
def test_connection(req: TestConnectionRequest, current_user: dict = Depends(get_current_user)):
    req.user_id = current_user["user_id"]
    return handle_test_connection(req)

@app.get("/analysis/history/{user_id}")
def get_user_history(user_id: int, workspace_id: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    return handle_get_user_history(current_user["user_id"], workspace_id)

@app.get("/analysis/latest/{user_id}")
def get_latest_analysis(user_id: int, workspace_id: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    return handle_get_latest_analysis(current_user["user_id"], workspace_id)

@app.get("/analysis/details/{analysis_id}")
def get_analysis_details(analysis_id: int, workspace_id: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    return handle_get_analysis_details(analysis_id, current_user["user_id"], workspace_id)

@app.delete("/analysis/delete/{analysis_id}")
def delete_analysis(analysis_id: int, current_user: dict = Depends(get_current_user)):
    return handle_delete_analysis(analysis_id, current_user["user_id"])

@app.get("/analysis/file-content")
def get_file_content(file_path: str, repo_path: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    return handle_get_file_content(file_path, repo_path)

# ----------------- Self-Training & Feedback Routes -----------------

@app.post("/analysis/feedback")
def submit_feedback(req: FeedbackRequest, current_user: dict = Depends(get_current_user)):
    req.user_id = current_user["user_id"]
    return handle_submit_feedback(req)

@app.get("/model/status")
def model_status():
    """Returns current active model version, sample counts, and retrain progress."""
    return handle_model_status()

@app.get("/model/history")
def model_history():
    """Returns a list of all model versions with their evaluation metrics."""
    return handle_model_history()

@app.post("/model/retrain")
def trigger_retrain(triggered_by: str = Query(default="admin")):
    """Triggers an immediate model retraining run using all accumulated labeled data."""
    return handle_retrain(triggered_by)

# ----------------- Model Registry & Workbench Routes -----------------

@app.get("/models/list")
def list_models_endpoint():
    return handle_list_models()

@app.post("/models/train")
def train_model_endpoint(req: TrainModelRequest, current_user: dict = Depends(get_current_user)):
    return handle_train_model(req, current_user["user_id"])

@app.post("/models/compare")
def compare_models_endpoint(req: CompareModelsRequest, current_user: dict = Depends(get_current_user)):
    return handle_compare_models(req, current_user["user_id"])

@app.post("/models/set-active")
def set_active_model_endpoint(req: SetActiveModelRequest, current_user: dict = Depends(get_current_user)):
    return handle_set_active_model(req.model_name)

# ----------------- Dataset Studio Routes -----------------

@app.post("/datasets/upload")
async def upload_dataset_endpoint(
    file: UploadFile = File(...),
    workspace_id: Optional[int] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    content = await file.read()
    return handle_save_uploaded_dataset(
        filename=file.filename or "dataset.csv",
        content_bytes=content,
        user_id=current_user["user_id"],
        workspace_id=workspace_id
    )

@app.get("/datasets/list")
def list_datasets_endpoint(workspace_id: Optional[int] = Query(None), current_user: dict = Depends(get_current_user)):
    return handle_list_datasets(current_user["user_id"], workspace_id)

@app.get("/datasets/{dataset_id}/preview")
def preview_dataset_endpoint(dataset_id: int, current_user: dict = Depends(get_current_user)):
    return handle_preview_dataset(dataset_id, current_user["user_id"])

@app.delete("/datasets/{dataset_id}")
def delete_dataset_endpoint(dataset_id: int, current_user: dict = Depends(get_current_user)):
    return handle_delete_dataset(dataset_id, current_user["user_id"])

# ----------------- Automated Repair & Rollback Routes -----------------

@app.post("/repair/candidate")
def generate_repair_candidate_endpoint(req: CandidateRepairRequest, current_user: dict = Depends(get_current_user)):
    return handle_generate_candidate_repair(req)

@app.post("/repair/verify")
def verify_repair_candidate_endpoint(req: VerifyRepairRequest, current_user: dict = Depends(get_current_user)):
    return handle_verify_candidate_repair(req)

@app.post("/repair/apply")
def apply_repair_patch_endpoint(req: ApplyPatchRequest, current_user: dict = Depends(get_current_user)):
    return handle_apply_repair_patch(req, current_user["user_id"])

@app.post("/repair/rollback/{patch_id}")
def rollback_repair_patch_endpoint(patch_id: int, current_user: dict = Depends(get_current_user)):
    return handle_rollback_repair_patch(patch_id, current_user["user_id"])

@app.get("/repair/history")
def get_repair_history_endpoint(workspace_id: Optional[int] = Query(None), current_user: dict = Depends(get_current_user)):
    return handle_get_repair_history(current_user["user_id"], workspace_id)

@app.get("/health")
def health_check():
    return {"status": "ok", "version": "2.0"}

# ----------------- Production Frontend SPA Serving -----------------
import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.exists(frontend_dist) and os.path.exists(os.path.join(frontend_dist, "index.html")):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        target = os.path.join(frontend_dist, full_path)
        if full_path and os.path.exists(target) and os.path.isfile(target):
            return FileResponse(target)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
