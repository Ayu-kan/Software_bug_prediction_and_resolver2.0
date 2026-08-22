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
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.api.app import (
    RegisterRequest, LoginRequest, ConfigRequest, AnalysisRequest, ResolveRequest,
    TestConnectionRequest, CreateWorkspaceRequest, InviteMemberRequest, RespondInviteRequest,
    UpdateRoleRequest, RemoveMemberRequest,
    handle_register, handle_login, handle_config, handle_get_config,
    handle_create_workspace, handle_get_user_workspaces, handle_get_workspace_details,
    handle_invite_member, handle_get_user_invitations, handle_respond_invitation,
    handle_get_workspace_invitations, handle_cancel_invitation,
    handle_update_member_role, handle_remove_member,
    handle_get_workspace_activities, handle_analysis, handle_get_latest_analysis,
    handle_get_user_history, handle_get_analysis_details, handle_delete_analysis,
    handle_resolve, handle_get_solutions, handle_test_connection, handle_get_file_content
)

from backend.database.db import init_db

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
def login(req: LoginRequest):
    return handle_login(req)

@app.post("/auth/config")
def config(req: ConfigRequest):
    return handle_config(req)

@app.get("/auth/config/{user_id}")
def get_config(user_id: int):
    return handle_get_config(user_id)

# ----------------- Workspace & RBAC Routes -----------------

@app.post("/workspaces/create")
def create_workspace_endpoint(req: CreateWorkspaceRequest):
    return handle_create_workspace(req)

@app.get("/workspaces/user/{user_id}")
def get_user_workspaces_endpoint(user_id: int):
    return handle_get_user_workspaces(user_id)

@app.get("/workspaces/{workspace_id}")
def get_workspace_details_endpoint(workspace_id: int, user_id: int = Query(...)):
    return handle_get_workspace_details(workspace_id, user_id)

@app.post("/workspaces/invite")
async def invite_member_endpoint(req: InviteMemberRequest):
    res = handle_invite_member(req)
    if res.get("success"):
        await ws_manager.broadcast_to_workspace(
            req.workspace_id,
            {"type": "invite_created", "data": res.get("invite"), "message": res.get("message")}
        )
    return res

@app.get("/workspaces/invitations/{user_id}")
def get_user_invitations_endpoint(user_id: int):
    return handle_get_user_invitations(user_id)

@app.post("/workspaces/invitations/{invite_id}/respond")
async def respond_invitation_endpoint(invite_id: int, req: RespondInviteRequest):
    res = handle_respond_invitation(invite_id, req)
    if res.get("success") and res.get("workspace_id"):
        await ws_manager.broadcast_to_workspace(
            res["workspace_id"],
            {"type": "invite_resolved", "invite_id": invite_id, "action": req.action, "message": res.get("message")}
        )
    return res

@app.get("/workspaces/{workspace_id}/invitations")
def get_workspace_invitations_endpoint(workspace_id: int, user_id: int = Query(...)):
    return handle_get_workspace_invitations(workspace_id, user_id)

@app.delete("/workspaces/invitations/{invite_id}")
async def cancel_invitation_endpoint(invite_id: int, user_id: int = Query(...)):
    return handle_cancel_invitation(invite_id, user_id)

@app.post("/workspaces/update-role")
async def update_member_role_endpoint(req: UpdateRoleRequest):
    res = handle_update_member_role(req)
    if res.get("success"):
        await ws_manager.broadcast_to_workspace(
            req.workspace_id,
            {"type": "role_updated", "target_user_id": req.target_user_id, "new_role": req.new_role}
        )
    return res

@app.post("/workspaces/remove-member")
async def remove_member_endpoint(req: RemoveMemberRequest):
    res = handle_remove_member(req)
    if res.get("success"):
        await ws_manager.broadcast_to_workspace(
            req.workspace_id,
            {"type": "member_removed", "target_user_id": req.target_user_id}
        )
    return res

@app.get("/workspaces/{workspace_id}/activities")
def get_workspace_activities_endpoint(workspace_id: int):
    return handle_get_workspace_activities(workspace_id)

# ----------------- Analysis & History Routes -----------------

@app.post("/analysis/run")
async def run_analysis(req: AnalysisRequest):
    res = handle_analysis(req.repo_path, req.user_id, req.workspace_id, req.analysis_mode or "Normal Mode (All Files)")
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
async def resolve_issue(req: ResolveRequest):
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
    user_id: Optional[int] = None
):
    return handle_get_solutions(analysis_id, file_path, workspace_id, user_id)

@app.post("/analysis/test-connection")
def test_connection(req: TestConnectionRequest):
    return handle_test_connection(req)

@app.get("/analysis/history/{user_id}")
def get_user_history(user_id: int, workspace_id: Optional[int] = None):
    return handle_get_user_history(user_id, workspace_id)

@app.get("/analysis/latest/{user_id}")
def get_latest_analysis(user_id: int, workspace_id: Optional[int] = None):
    return handle_get_latest_analysis(user_id, workspace_id)

@app.get("/analysis/details/{analysis_id}")
def get_analysis_details(analysis_id: int, user_id: int = Query(...), workspace_id: Optional[int] = None):
    return handle_get_analysis_details(analysis_id, user_id, workspace_id)

@app.delete("/analysis/delete/{analysis_id}")
def delete_analysis(analysis_id: int, user_id: int = Query(...)):
    return handle_delete_analysis(analysis_id, user_id)

@app.get("/analysis/file-content")
def get_file_content(file_path: str, repo_path: Optional[str] = None):
    return handle_get_file_content(file_path, repo_path)

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
