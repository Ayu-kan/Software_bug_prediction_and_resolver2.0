"""
backend/auth/auth_service.py
----------------------------
User authentication and API key persistence management.
"""

from backend.database.db import get_db
from backend.auth.security import hash_password, verify_password, create_access_token, verify_access_token, encrypt_api_key, decrypt_api_key

def register_user(username: str, email: str, password: str) -> dict:
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM users WHERE username = ? OR email = ?", (username, email))
    if cursor.fetchone():
        conn.close()
        return {"success": False, "message": "Username or Email already registered."}
        
    pwd_hash = hash_password(password)
    cursor.execute(
        "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
        (username, email, pwd_hash)
    )
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()
    
    token = create_access_token({"user_id": user_id, "username": username})
    return {"success": True, "user_id": user_id, "username": username, "token": token}

def login_user(username: str, password: str) -> dict:
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, username, password_hash, llm_provider, llm_api_key FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    conn.close()
    
    if not user or not verify_password(password, user["password_hash"]):
        return {"success": False, "message": "Invalid username or password."}
        
    token = create_access_token({"user_id": user["id"], "username": user["username"]})
    return {
        "success": True,
        "user_id": user["id"],
        "username": user["username"],
        "llm_provider": user["llm_provider"] or "openai",
        "llm_api_key": decrypt_api_key(user["llm_api_key"]) if user["llm_api_key"] else "",
        "token": token
    }

def update_user_llm_config(user_id: int, provider: str, api_key: str) -> dict:
    conn = get_db()
    cursor = conn.cursor()
    encrypted_api_key = encrypt_api_key(api_key)
    cursor.execute(
        "UPDATE users SET llm_provider = ?, llm_api_key = ? WHERE id = ?",
        (provider, encrypted_api_key, user_id)
    )
    conn.commit()
    conn.close()
    return {"success": True, "message": "LLM Configuration saved successfully."}

def get_user_llm_config(user_id: int) -> dict:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT llm_provider, llm_api_key FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {"llm_provider": row["llm_provider"] or "openai", "llm_api_key": decrypt_api_key(row["llm_api_key"]) if row["llm_api_key"] else ""}
    return {"llm_provider": "openai", "llm_api_key": ""}
