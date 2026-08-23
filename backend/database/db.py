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

    # 8. Training Samples — Accumulates labeled feature vectors for self-training
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS training_samples (
            id                     INTEGER PRIMARY KEY AUTOINCREMENT,
            repo_url               TEXT NOT NULL,
            file_path              TEXT NOT NULL,
            loc                    REAL DEFAULT 0,
            complexity             REAL DEFAULT 0,
            function_count         REAL DEFAULT 0,
            avg_function_size      REAL DEFAULT 0,
            max_function_size      REAL DEFAULT 0,
            dependency_count       REAL DEFAULT 0,
            commit_count           REAL DEFAULT 0,
            developer_count        REAL DEFAULT 0,
            lines_added            REAL DEFAULT 0,
            lines_deleted          REAL DEFAULT 0,
            code_churn             REAL DEFAULT 0,
            recent_commit_count    REAL DEFAULT 0,
            days_since_last_change REAL DEFAULT 0,
            previous_bug_count     REAL DEFAULT 0,
            auto_label             INTEGER DEFAULT NULL,
            user_label             INTEGER DEFAULT NULL,
            used_in_training       INTEGER DEFAULT 0,
            created_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 9. Model Versions — Tracks every retrain run with performance metrics
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS model_versions (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            version_tag      TEXT NOT NULL,
            algorithm        TEXT NOT NULL,
            training_samples INTEGER NOT NULL,
            precision_score  REAL DEFAULT NULL,
            recall_score     REAL DEFAULT NULL,
            f1_score         REAL DEFAULT NULL,
            roc_auc          REAL DEFAULT NULL,
            pr_auc           REAL DEFAULT NULL,
            top20_recall     REAL DEFAULT NULL,
            model_path       TEXT NOT NULL,
            is_active        INTEGER DEFAULT 0,
            triggered_by     TEXT DEFAULT 'auto',
            created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 10. User Feedback — Per-file confirmed/disputed signals from users
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_feedback (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id        INTEGER NOT NULL,
            analysis_id    INTEGER DEFAULT NULL,
            file_path      TEXT NOT NULL,
            predicted_risk REAL NOT NULL,
            feedback       TEXT NOT NULL,
            created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id),
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
            "SELECT 1 FROM workspace_members WHERE workspace_id = ? AND user_id = ?",
            (workspace_id, user_id)
        )
        if not cursor.fetchone():
            conn.close()
            return []
        cursor.execute(
            """
            SELECT a.id, a.user_id, a.workspace_id, a.repo_name, a.total_files, a.high_risk_count, a.analysis_mode, a.full_results_json, a.created_at, u.username as creator_name
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
            SELECT a.id, a.user_id, a.workspace_id, a.repo_name, a.total_files, a.high_risk_count, a.analysis_mode, a.full_results_json, a.created_at, u.username as creator_name
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
    cursor.execute("SELECT id, user_id, workspace_id FROM analyses WHERE id = ?", (analysis_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return False
    
    is_creator = (row["user_id"] == user_id)
    is_admin = False
    if row["workspace_id"]:
        cursor.execute(
            "SELECT role FROM workspace_members WHERE workspace_id = ? AND user_id = ?",
            (row["workspace_id"], user_id)
        )
        m_row = cursor.fetchone()
        if m_row and m_row["role"] == "admin":
            is_admin = True

    if not is_creator and not is_admin:
        conn.close()
        return False

    cursor.execute("DELETE FROM analyses WHERE id = ?", (analysis_id,))
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


# ----------------- Self-Training Helper Functions -----------------

FEATURE_COLS = [
    "loc", "complexity", "function_count", "avg_function_size", "max_function_size",
    "dependency_count", "commit_count", "developer_count", "lines_added",
    "lines_deleted", "code_churn", "recent_commit_count", "days_since_last_change",
    "previous_bug_count",
]

def save_training_samples(repo_url: str, rows: List[Dict[str, Any]]) -> int:
    """
    Bulk-inserts feature vectors with auto_label into training_samples.
    Each row must have the 14 FEATURE_COLS plus 'file' and 'future_bug'.
    Returns the number of rows inserted.
    """
    if not rows:
        return 0
    conn = get_db()
    cursor = conn.cursor()
    inserted = 0
    for row in rows:
        file_path = row.get("file", "")
        auto_label = int(row.get("future_bug", 0)) if row.get("future_bug") is not None else None
        cursor.execute(
            """
            INSERT INTO training_samples
                (repo_url, file_path, loc, complexity, function_count, avg_function_size,
                 max_function_size, dependency_count, commit_count, developer_count,
                 lines_added, lines_deleted, code_churn, recent_commit_count,
                 days_since_last_change, previous_bug_count, auto_label)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                repo_url, file_path,
                float(row.get("loc", 0) or 0),
                float(row.get("complexity", 0) or 0),
                float(row.get("function_count", 0) or 0),
                float(row.get("avg_function_size", 0) or 0),
                float(row.get("max_function_size", 0) or 0),
                float(row.get("dependency_count", 0) or 0),
                float(row.get("commit_count", 0) or 0),
                float(row.get("developer_count", 0) or 0),
                float(row.get("lines_added", 0) or 0),
                float(row.get("lines_deleted", 0) or 0),
                float(row.get("code_churn", 0) or 0),
                float(row.get("recent_commit_count", 0) or 0),
                float(row.get("days_since_last_change", 0) or 0),
                float(row.get("previous_bug_count", 0) or 0),
                auto_label,
            )
        )
        inserted += 1
    conn.commit()
    conn.close()
    return inserted


def get_training_dataset() -> List[Dict[str, Any]]:
    """
    Returns all training samples that have at least one label (auto or user).
    User label takes precedence over auto_label when both are present.
    """
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT *, COALESCE(user_label, auto_label) AS label
        FROM training_samples
        WHERE user_label IS NOT NULL OR auto_label IS NOT NULL
        ORDER BY created_at ASC
        """
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_training_stats() -> Dict[str, Any]:
    """Returns summary stats for the training data and model versions."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT COUNT(*) AS total FROM training_samples WHERE user_label IS NOT NULL OR auto_label IS NOT NULL"
    )
    total_labeled = (cursor.fetchone() or {}).get("total", 0)

    cursor.execute(
        "SELECT COUNT(*) AS cnt FROM training_samples WHERE used_in_training = 0 AND (user_label IS NOT NULL OR auto_label IS NOT NULL)"
    )
    pending = (cursor.fetchone() or {}).get("cnt", 0)

    cursor.execute(
        "SELECT COUNT(*) AS cnt FROM training_samples WHERE user_label IS NOT NULL"
    )
    user_labeled = (cursor.fetchone() or {}).get("cnt", 0)

    cursor.execute(
        "SELECT COUNT(*) AS cnt FROM training_samples WHERE auto_label IS NOT NULL"
    )
    auto_labeled = (cursor.fetchone() or {}).get("cnt", 0)

    cursor.execute(
        """
        SELECT version_tag, algorithm, training_samples, precision_score, recall_score,
               f1_score, roc_auc, pr_auc, top20_recall, model_path, created_at
        FROM model_versions WHERE is_active = 1 ORDER BY id DESC LIMIT 1
        """
    )
    active_row = cursor.fetchone()
    active_model = dict(active_row) if active_row else None

    conn.close()
    return {
        "total_labeled": total_labeled,
        "auto_labeled": auto_labeled,
        "user_labeled": user_labeled,
        "pending_samples": pending,
        "active_model": active_model,
    }


def save_model_version(
    version_tag: str,
    algorithm: str,
    training_samples: int,
    metrics: Dict[str, Any],
    model_path: str,
    triggered_by: str = "auto",
) -> int:
    """Records a retrain run in model_versions. Returns the new version id."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO model_versions
            (version_tag, algorithm, training_samples, precision_score, recall_score,
             f1_score, roc_auc, pr_auc, top20_recall, model_path, is_active, triggered_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        """,
        (
            version_tag, algorithm, training_samples,
            metrics.get("precision"), metrics.get("recall"),
            metrics.get("f1"), metrics.get("roc_auc"),
            metrics.get("pr_auc"), metrics.get("top20_recall"),
            model_path, triggered_by,
        )
    )
    version_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return version_id


def set_active_model_version(version_id: int) -> None:
    """Marks a specific model version as active; clears all other is_active flags."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE model_versions SET is_active = 0")
    cursor.execute("UPDATE model_versions SET is_active = 1 WHERE id = ?", (version_id,))
    conn.commit()
    conn.close()


def get_model_history(limit: int = 20) -> List[Dict[str, Any]]:
    """Returns list of model versions ordered newest first."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, version_tag, algorithm, training_samples, precision_score, recall_score,
               f1_score, roc_auc, pr_auc, top20_recall, model_path, is_active,
               triggered_by, created_at
        FROM model_versions ORDER BY id DESC LIMIT ?
        """,
        (limit,)
    )
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def save_user_feedback(
    user_id: int,
    file_path: str,
    predicted_risk: float,
    feedback: str,
    analysis_id: Optional[int] = None,
) -> bool:
    """
    Saves a user feedback signal ('confirmed_bug' or 'not_a_bug') for a file.
    Also updates the user_label on the most recent matching training_sample row.
    """
    if feedback not in ("confirmed_bug", "not_a_bug"):
        return False
    label = 1 if feedback == "confirmed_bug" else 0
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO user_feedback (user_id, analysis_id, file_path, predicted_risk, feedback)
        VALUES (?, ?, ?, ?, ?)
        """,
        (user_id, analysis_id, file_path, predicted_risk, feedback)
    )
    # Back-propagate label to the most recent matching training_sample
    cursor.execute(
        """
        UPDATE training_samples SET user_label = ?
        WHERE file_path = ? AND id = (
            SELECT id FROM training_samples WHERE file_path = ? ORDER BY created_at DESC LIMIT 1
        )
        """,
        (label, file_path, file_path)
    )
    conn.commit()
    conn.close()
    return True


def mark_samples_used(sample_ids: List[int]) -> None:
    """Marks training sample rows as used_in_training = 1 after a retrain."""
    if not sample_ids:
        return
    conn = get_db()
    cursor = conn.cursor()
    placeholders = ",".join("?" * len(sample_ids))
    cursor.execute(
        f"UPDATE training_samples SET used_in_training = 1 WHERE id IN ({placeholders})",
        sample_ids
    )
    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
