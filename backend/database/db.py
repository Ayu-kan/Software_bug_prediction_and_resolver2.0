"""
backend/database/db.py
----------------------
Database initialization and connection management using SQLite.
Supports user authentication, per-provider API key storage,
collaborative workspaces with RBAC (Admin, Editor, Viewer),
real-time activity auditing, and isolated analysis history.
"""

import os
import sqlite3
import json
import shutil
from typing import Optional, List, Dict, Any

if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    DB_PATH = os.path.join("/tmp", "app.db")
    local_template = os.path.join(os.path.dirname(__file__), "app.db")
    if not os.path.exists(DB_PATH) and os.path.exists(local_template):
        try:
            shutil.copy2(local_template, DB_PATH)
        except Exception:
            pass
else:
    DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "app.db"))

def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. User table with authentication and persistent LLM API configurations
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            llm_provider TEXT DEFAULT 'openai',
            llm_api_key TEXT DEFAULT '',
            llm_keys_json TEXT DEFAULT '{}',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # 2. Collaborative Workspaces Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS workspaces (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            owner_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (owner_id) REFERENCES users (id)
        )
    """)

    # 3. Workspace Members Table with RBAC (Role: 'admin', 'editor', 'viewer')
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS workspace_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            role TEXT NOT NULL DEFAULT 'editor',
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(workspace_id, user_id),
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    """)

    # 4. Workspace Invitations Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS workspace_invites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            invited_by INTEGER NOT NULL,
            email TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'editor',
            code TEXT UNIQUE NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
            FOREIGN KEY (invited_by) REFERENCES users (id)
        )
    """)

    # 5. Workspace Activity Log (Real-time Collaboration Feed)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS workspace_activities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            action_type TEXT NOT NULL,
            description TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)

    # 6. User and Workspace Analyses Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            workspace_id INTEGER DEFAULT NULL,
            repo_name TEXT NOT NULL,
            repo_url TEXT DEFAULT '',
            total_files INTEGER NOT NULL,
            high_risk_count INTEGER NOT NULL,
            analysis_mode TEXT DEFAULT 'Normal Mode (All Files)',
            full_results_json TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE SET NULL
        )
    """)

    # 7. AI Solutions Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ai_solutions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            workspace_id INTEGER DEFAULT NULL,
            analysis_id INTEGER DEFAULT NULL,
            file_path TEXT NOT NULL,
            generated_solution TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (workspace_id) REFERENCES workspaces (id) ON DELETE SET NULL,
            FOREIGN KEY (analysis_id) REFERENCES analyses (id) ON DELETE CASCADE
        )
    """)

    # Auto-migrate missing columns for existing users table
    cursor.execute("PRAGMA table_info(users)")
    u_cols = [r["name"] for r in cursor.fetchall()]
    if "llm_keys_json" not in u_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN llm_keys_json TEXT DEFAULT '{}'")
    if "email" not in u_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN email TEXT DEFAULT ''")
    if "llm_provider" not in u_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN llm_provider TEXT DEFAULT 'openai'")
    if "llm_api_key" not in u_cols:
        cursor.execute("ALTER TABLE users ADD COLUMN llm_api_key TEXT DEFAULT ''")

    # Auto-migrate analyses table
    cursor.execute("PRAGMA table_info(analyses)")
    a_cols = [r["name"] for r in cursor.fetchall()]
    if "workspace_id" not in a_cols:
        cursor.execute("ALTER TABLE analyses ADD COLUMN workspace_id INTEGER DEFAULT NULL")

    # Auto-migrate workspace_invites table
    cursor.execute("PRAGMA table_info(workspace_invites)")
    wi_cols = [r["name"] for r in cursor.fetchall()]
    if "invited_user_id" not in wi_cols:
        cursor.execute("ALTER TABLE workspace_invites ADD COLUMN invited_user_id INTEGER DEFAULT NULL")
    if "username" not in wi_cols:
        cursor.execute("ALTER TABLE workspace_invites ADD COLUMN username TEXT DEFAULT ''")
    if "code" not in wi_cols:
        cursor.execute("ALTER TABLE workspace_invites ADD COLUMN code TEXT DEFAULT ''")
    if "email" not in wi_cols:
        cursor.execute("ALTER TABLE workspace_invites ADD COLUMN email TEXT DEFAULT ''")
    if "status" not in wi_cols:
        cursor.execute("ALTER TABLE workspace_invites ADD COLUMN status TEXT DEFAULT 'pending'")
    
    conn.commit()
    conn.close()

# ----------------- Analysis & Solution Functions -----------------

def save_analysis_record(
    user_id: int,
    repo_name: str,
    total_files: int,
    high_risk_count: int,
    analysis_mode: str,
    full_results_json: str,
    workspace_id: Optional[int] = None
) -> int:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO analyses (user_id, workspace_id, repo_name, total_files, high_risk_count, analysis_mode, full_results_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (user_id, workspace_id, repo_name, total_files, high_risk_count, analysis_mode, full_results_json)
    )
    analysis_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return analysis_id

def get_latest_user_analysis(user_id: int, workspace_id: Optional[int] = None):
    conn = get_db()
    cursor = conn.cursor()
    if workspace_id:
        cursor.execute(
            """
            SELECT id, user_id, workspace_id, repo_name, total_files, high_risk_count, analysis_mode, full_results_json, created_at
            FROM analyses
            WHERE workspace_id = ?
            ORDER BY created_at DESC LIMIT 1
            """,
            (workspace_id,)
        )
    else:
        cursor.execute(
            """
            SELECT id, user_id, workspace_id, repo_name, total_files, high_risk_count, analysis_mode, full_results_json, created_at
            FROM analyses
            WHERE user_id = ? AND (workspace_id IS NULL OR workspace_id = 0)
            ORDER BY created_at DESC LIMIT 1
            """,
            (user_id,)
        )
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def get_user_analyses_list(user_id: int, workspace_id: Optional[int] = None):
    conn = get_db()
    cursor = conn.cursor()
    if workspace_id:
        cursor.execute(
            """
            SELECT a.id, a.user_id, a.workspace_id, a.repo_name, a.total_files, a.high_risk_count, a.analysis_mode, a.created_at, u.username as creator_name
            FROM analyses a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE a.workspace_id = ?
            ORDER BY a.created_at DESC
            """,
            (workspace_id,)
        )
    else:
        cursor.execute(
            """
            SELECT a.id, a.user_id, a.workspace_id, a.repo_name, a.total_files, a.high_risk_count, a.analysis_mode, a.created_at, u.username as creator_name
            FROM analyses a
            LEFT JOIN users u ON a.user_id = u.id
            WHERE a.user_id = ? AND (a.workspace_id IS NULL OR a.workspace_id = 0)
            ORDER BY a.created_at DESC
            """,
            (user_id,)
        )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_analysis_by_id(analysis_id: int, user_id: int, workspace_id: Optional[int] = None):
    conn = get_db()
    cursor = conn.cursor()
    if workspace_id:
        cursor.execute(
            """
            SELECT a.* FROM analyses a
            JOIN workspace_members wm ON a.workspace_id = wm.workspace_id
            WHERE a.id = ? AND wm.user_id = ?
            """,
            (analysis_id, user_id)
        )
    else:
        cursor.execute(
            "SELECT * FROM analyses WHERE id = ? AND user_id = ?",
            (analysis_id, user_id)
        )
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def delete_user_analysis(analysis_id: int, user_id: int) -> bool:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM analyses WHERE id = ? AND user_id = ?", (analysis_id, user_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

def save_ai_solution(
    user_id: int,
    file_path: str,
    generated_solution: Any,
    analysis_id: Optional[int] = None,
    workspace_id: Optional[int] = None
):
    conn = get_db()
    cursor = conn.cursor()

    if isinstance(generated_solution, (dict, list)):
        generated_solution = json.dumps(generated_solution, ensure_ascii=False)

    cursor.execute(
        """
        INSERT INTO ai_solutions
        (user_id, workspace_id, analysis_id, file_path, generated_solution)
        VALUES (?, ?, ?, ?, ?)
        """,
        (user_id, workspace_id, analysis_id, file_path, generated_solution)
    )

    conn.commit()
    conn.close()

def get_analysis_solutions(analysis_id: Optional[int] = None, file_path: Optional[str] = None, workspace_id: Optional[int] = None, user_id: Optional[int] = None):
    conn = get_db()
    cursor = conn.cursor()
    query = "SELECT s.*, u.username FROM ai_solutions s LEFT JOIN users u ON s.user_id = u.id WHERE 1=1"
    params = []
    if analysis_id:
        query += " AND s.analysis_id = ?"
        params.append(analysis_id)
    if file_path:
        query += " AND s.file_path = ?"
        params.append(file_path)
    if workspace_id:
        query += " AND s.workspace_id = ?"
        params.append(workspace_id)
    elif user_id:
        query += " AND s.user_id = ?"
        params.append(user_id)
    query += " ORDER BY s.created_at DESC"
    cursor.execute(query, tuple(params))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ----------------- Collaborative Workspace Functions -----------------

def create_workspace(name: str, owner_id: int, description: str = "") -> dict:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO workspaces (name, description, owner_id) VALUES (?, ?, ?)",
        (name, description, owner_id)
    )
    workspace_id = cursor.lastrowid
    
    # Automatically add creator as 'admin'
    cursor.execute(
        "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, 'admin')",
        (workspace_id, owner_id)
    )
    
    # Log activity
    cursor.execute("SELECT username FROM users WHERE id = ?", (owner_id,))
    user_row = cursor.fetchone()
    username = user_row["username"] if user_row else "Admin"
    cursor.execute(
        "INSERT INTO workspace_activities (workspace_id, user_id, username, action_type, description) VALUES (?, ?, ?, 'workspace_created', ?)",
        (workspace_id, owner_id, username, f"Created collaborative workspace '{name}'")
    )
    
    conn.commit()
    conn.close()
    return {
        "id": workspace_id,
        "name": name,
        "description": description,
        "owner_id": owner_id,
        "role": "admin"
    }

def get_user_workspaces(user_id: int) -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT w.id, w.name, w.description, w.owner_id, w.created_at, wm.role,
               (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) as member_count,
               (SELECT COUNT(*) FROM analyses WHERE workspace_id = w.id) as analysis_count
        FROM workspaces w
        JOIN workspace_members wm ON w.id = wm.workspace_id
        WHERE wm.user_id = ?
        ORDER BY w.created_at DESC
        """,
        (user_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_workspace_details(workspace_id: int, user_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT w.id, w.name, w.description, w.owner_id, w.created_at, wm.role
        FROM workspaces w
        JOIN workspace_members wm ON w.id = wm.workspace_id
        WHERE w.id = ? AND wm.user_id = ?
        """,
        (workspace_id, user_id)
    )
    ws = cursor.fetchone()
    if not ws:
        conn.close()
        return None
        
    result = dict(ws)
    # Fetch members
    cursor.execute(
        """
        SELECT wm.id, wm.workspace_id, wm.user_id, wm.role, wm.joined_at, u.username, u.email
        FROM workspace_members wm
        JOIN users u ON wm.user_id = u.id
        WHERE wm.workspace_id = ?
        ORDER BY wm.joined_at ASC
        """,
        (workspace_id,)
    )
    result["members"] = [dict(m) for m in cursor.fetchall()]
    conn.close()
    return result

def get_user_role_in_workspace(workspace_id: int, user_id: int) -> Optional[str]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?",
        (workspace_id, user_id)
    )
    row = cursor.fetchone()
    conn.close()
    return row["role"] if row else None

def add_workspace_member(workspace_id: int, user_id: int, role: str = "editor", actor_id: Optional[int] = None) -> bool:
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT OR REPLACE INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)",
            (workspace_id, user_id, role)
        )
        
        actor_name = "Admin"
        if actor_id:
            cursor.execute("SELECT username FROM users WHERE id = ?", (actor_id,))
            u = cursor.fetchone()
            if u:
                actor_name = u["username"]
        cursor.execute("SELECT username FROM users WHERE id = ?", (user_id,))
        target_u = cursor.fetchone()
        target_name = target_u["username"] if target_u else f"User #{user_id}"
        
        cursor.execute(
            "INSERT INTO workspace_activities (workspace_id, user_id, username, action_type, description) VALUES (?, ?, ?, 'member_added', ?)",
            (workspace_id, actor_id or user_id, actor_name, f"Added {target_name} as {role.capitalize()}")
        )
        conn.commit()
        return True
    except Exception:
        return False
    finally:
        conn.close()

def update_member_role(workspace_id: int, target_user_id: int, new_role: str, actor_id: int) -> bool:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE workspace_members SET role = ? WHERE workspace_id = ? AND user_id = ?",
        (new_role, workspace_id, target_user_id)
    )
    success = cursor.rowcount > 0
    if success:
        cursor.execute("SELECT username FROM users WHERE id = ?", (actor_id,))
        actor_u = cursor.fetchone()
        actor_name = actor_u["username"] if actor_u else "Admin"
        cursor.execute("SELECT username FROM users WHERE id = ?", (target_user_id,))
        target_u = cursor.fetchone()
        target_name = target_u["username"] if target_u else f"User #{target_user_id}"
        
        cursor.execute(
            "INSERT INTO workspace_activities (workspace_id, user_id, username, action_type, description) VALUES (?, ?, ?, 'role_updated', ?)",
            (workspace_id, actor_id, actor_name, f"Changed role of {target_name} to {new_role.capitalize()}")
        )
        conn.commit()
    conn.close()
    return success

def remove_workspace_member(workspace_id: int, target_user_id: int, actor_id: int) -> bool:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM workspace_members WHERE workspace_id = ? AND user_id = ?",
        (workspace_id, target_user_id)
    )
    success = cursor.rowcount > 0
    if success:
        cursor.execute("SELECT username FROM users WHERE id = ?", (actor_id,))
        actor_u = cursor.fetchone()
        actor_name = actor_u["username"] if actor_u else "Admin"
        cursor.execute("SELECT username FROM users WHERE id = ?", (target_user_id,))
        target_u = cursor.fetchone()
        target_name = target_u["username"] if target_u else f"User #{target_user_id}"
        
        cursor.execute(
            "INSERT INTO workspace_activities (workspace_id, user_id, username, action_type, description) VALUES (?, ?, ?, 'member_removed', ?)",
            (workspace_id, actor_id, actor_name, f"Removed {target_name} from workspace")
        )
        conn.commit()
    conn.close()
    return success

def log_workspace_activity(workspace_id: int, user_id: int, username: str, action_type: str, description: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO workspace_activities (workspace_id, user_id, username, action_type, description) VALUES (?, ?, ?, ?, ?)",
        (workspace_id, user_id, username, action_type, description)
    )
    conn.commit()
    conn.close()

def create_workspace_invitation(workspace_id: int, invited_by: int, query: str, role: str = "editor") -> dict:
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. Verify actor is admin
    cursor.execute("SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?", (workspace_id, invited_by))
    actor_row = cursor.fetchone()
    if not actor_row or actor_row["role"] != "admin":
        conn.close()
        return {"success": False, "error": "Only workspace Admins can send invitations."}
        
    # 2. Find target user
    cursor.execute("SELECT id, username, email FROM users WHERE username = ? OR email = ?", (query.strip(), query.strip()))
    target = cursor.fetchone()
    if not target:
        conn.close()
        return {"success": False, "error": f"No registered user found with username or email '{query}'."}
        
    target_id = target["id"]
    target_uname = target["username"]
    target_email = target["email"]
    
    # 3. Check if already member
    cursor.execute("SELECT id FROM workspace_members WHERE workspace_id = ? AND user_id = ?", (workspace_id, target_id))
    if cursor.fetchone():
        conn.close()
        return {"success": False, "error": f"'{target_uname}' is already a member of this workspace."}
        
    # 4. Check if invite already pending
    cursor.execute(
        "SELECT id FROM workspace_invites WHERE workspace_id = ? AND (invited_user_id = ? OR email = ?) AND status = 'pending'",
        (workspace_id, target_id, target_email)
    )
    if cursor.fetchone():
        conn.close()
        return {"success": False, "error": f"An invitation is already pending for '{target_uname}'."}
        
    # 5. Insert pending invitation
    invite_role = role if role in ["admin", "editor", "viewer"] else "editor"
    import uuid
    code = f"INV-{uuid.uuid4().hex[:8].upper()}"
    cursor.execute(
        """
        INSERT INTO workspace_invites (workspace_id, invited_by, invited_user_id, username, email, role, code, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        """,
        (workspace_id, invited_by, target_id, target_uname, target_email, invite_role, code)
    )
    invite_id = cursor.lastrowid
    
    # 6. Log workspace activity
    cursor.execute("SELECT username FROM users WHERE id = ?", (invited_by,))
    inviter_row = cursor.fetchone()
    inviter_name = inviter_row["username"] if inviter_row else "Admin"
    
    cursor.execute(
        "INSERT INTO workspace_activities (workspace_id, user_id, username, action_type, description) VALUES (?, ?, ?, 'invite_created', ?)",
        (workspace_id, invited_by, inviter_name, f"Invited {target_uname} to join as {invite_role.capitalize()} (Pending)")
    )
    conn.commit()
    conn.close()
    
    return {
        "success": True,
        "message": f"Invitation sent to {target_uname}. Status is Pending until accepted.",
        "invite": {
            "id": invite_id,
            "workspace_id": workspace_id,
            "username": target_uname,
            "role": invite_role,
            "status": "pending"
        }
    }

def get_user_pending_invitations(user_id: int) -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT username, email FROM users WHERE id = ?", (user_id,))
    u_row = cursor.fetchone()
    if not u_row:
        conn.close()
        return []
        
    u_name = u_row["username"]
    u_email = u_row["email"]
    
    cursor.execute(
        """
        SELECT wi.id, wi.workspace_id, wi.role, wi.status, wi.created_at,
               w.name as workspace_name, w.description as workspace_description,
               u.username as inviter_username
        FROM workspace_invites wi
        JOIN workspaces w ON wi.workspace_id = w.id
        JOIN users u ON wi.invited_by = u.id
        WHERE (wi.invited_user_id = ? OR wi.username = ? OR wi.email = ?)
          AND wi.status = 'pending'
        ORDER BY wi.created_at DESC
        """,
        (user_id, u_name, u_email)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def respond_to_workspace_invitation(invite_id: int, user_id: int, action: str) -> dict:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT username, email FROM users WHERE id = ?", (user_id,))
    u_row = cursor.fetchone()
    if not u_row:
        conn.close()
        return {"success": False, "error": "User not found."}
        
    u_name = u_row["username"]
    u_email = u_row["email"]
    
    cursor.execute(
        """
        SELECT wi.id, wi.workspace_id, wi.role, wi.status, w.name as workspace_name
        FROM workspace_invites wi
        JOIN workspaces w ON wi.workspace_id = w.id
        WHERE wi.id = ? AND (wi.invited_user_id = ? OR wi.username = ? OR wi.email = ?) AND wi.status = 'pending'
        """,
        (invite_id, user_id, u_name, u_email)
    )
    invite = cursor.fetchone()
    if not invite:
        conn.close()
        return {"success": False, "error": "Invitation not found or has already been resolved."}
        
    ws_id = invite["workspace_id"]
    ws_name = invite["workspace_name"]
    role = invite["role"]
    
    if action == "accept":
        cursor.execute("UPDATE workspace_invites SET status = 'accepted' WHERE id = ?", (invite_id,))
        cursor.execute(
            "INSERT OR REPLACE INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)",
            (ws_id, user_id, role)
        )
        cursor.execute(
            "INSERT INTO workspace_activities (workspace_id, user_id, username, action_type, description) VALUES (?, ?, ?, 'member_joined', ?)",
            (ws_id, user_id, u_name, f"{u_name} accepted the invitation and joined as {role.capitalize()}")
        )
        conn.commit()
        conn.close()
        return {
            "success": True,
            "message": f"Successfully joined '{ws_name}'!",
            "workspace_id": ws_id,
            "status": "accepted"
        }
    elif action == "reject":
        cursor.execute("UPDATE workspace_invites SET status = 'rejected' WHERE id = ?", (invite_id,))
        cursor.execute(
            "INSERT INTO workspace_activities (workspace_id, user_id, username, action_type, description) VALUES (?, ?, ?, 'invite_rejected', ?)",
            (ws_id, user_id, u_name, f"{u_name} declined the workspace invitation")
        )
        conn.commit()
        conn.close()
        return {
            "success": True,
            "message": f"Declined invitation to '{ws_name}'.",
            "workspace_id": ws_id,
            "status": "rejected"
        }
    else:
        conn.close()
        return {"success": False, "error": "Invalid action. Use 'accept' or 'reject'."}

def get_workspace_pending_invitations(workspace_id: int, actor_id: int) -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?", (workspace_id, actor_id))
    actor_row = cursor.fetchone()
    if not actor_row or actor_row["role"] != "admin":
        conn.close()
        return []
        
    cursor.execute(
        """
        SELECT wi.id, wi.workspace_id, wi.invited_user_id, wi.username, wi.email, wi.role, wi.status, wi.created_at,
               u.username as inviter_username
        FROM workspace_invites wi
        JOIN users u ON wi.invited_by = u.id
        WHERE wi.workspace_id = ? AND wi.status = 'pending'
        ORDER BY wi.created_at DESC
        """,
        (workspace_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def cancel_workspace_invitation(invite_id: int, actor_id: int) -> dict:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT workspace_id, username FROM workspace_invites WHERE id = ? AND status = 'pending'", (invite_id,))
    inv_row = cursor.fetchone()
    if not inv_row:
        conn.close()
        return {"success": False, "error": "Pending invitation not found."}
        
    ws_id = inv_row["workspace_id"]
    target_uname = inv_row["username"]
    
    cursor.execute("SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?", (ws_id, actor_id))
    actor_row = cursor.fetchone()
    if not actor_row or actor_row["role"] != "admin":
        conn.close()
        return {"success": False, "error": "Only workspace Admins can cancel invitations."}
        
    cursor.execute("UPDATE workspace_invites SET status = 'cancelled' WHERE id = ?", (invite_id,))
    cursor.execute(
        "INSERT INTO workspace_activities (workspace_id, user_id, username, action_type, description) VALUES (?, ?, 'Admin', 'invite_cancelled', ?)",
        (ws_id, actor_id, f"Cancelled pending invitation for {target_uname}")
    )
    conn.commit()
    conn.close()
    return {"success": True, "message": "Invitation cancelled successfully."}

def log_workspace_activity(workspace_id: int, user_id: int, username: str, action_type: str, description: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO workspace_activities (workspace_id, user_id, username, action_type, description) VALUES (?, ?, ?, ?, ?)",
        (workspace_id, user_id, username, action_type, description)
    )
    conn.commit()
    conn.close()

def get_workspace_activities(workspace_id: int, limit: int = 20) -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, workspace_id, user_id, username, action_type, description, created_at
        FROM workspace_activities
        WHERE workspace_id = ?
        ORDER BY created_at DESC LIMIT ?
        """,
        (workspace_id, limit)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
