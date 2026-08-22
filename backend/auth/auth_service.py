"""
backend/auth/auth_service.py
----------------------------
User authentication, per-provider encrypted API key persistence, and user lookup management.
"""

import json
from backend.database.db import get_db
from backend.auth.security import (
    hash_password, verify_password, create_access_token, verify_access_token,
    encrypt_api_key, decrypt_api_key
)

MASKED_KEY = '••••••••'

def register_user(username: str, email: str, password: str) -> dict:
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM users WHERE username = ? OR email = ?", (username, email))
    if cursor.fetchone():
        conn.close()
        return {"success": False, "message": "Username or Email already registered."}
        
    pwd_hash = hash_password(password)
    cursor.execute(
        "INSERT INTO users (username, email, password_hash, llm_provider, llm_api_key, llm_keys_json) VALUES (?, ?, ?, 'openai', '', '{}')",
        (username, email, pwd_hash)
    )
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()
    
    token = create_access_token({"user_id": user_id, "username": username})
    return {
        "success": True,
        "user_id": user_id,
        "username": username,
        "email": email,
        "token": token,
        "llm_provider": "openai",
        "llm_api_key": "",
        "keys": {"openai": "", "gemini": "", "groq": ""}
    }

def login_user(username: str, password: str) -> dict:
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT id, username, email, password_hash, llm_provider, llm_api_key, llm_keys_json FROM users WHERE username = ? OR email = ?",
        (username, username)
    )
    user = cursor.fetchone()
    conn.close()
    
    if not user or not verify_password(password, user["password_hash"]):
        return {"success": False, "message": "Invalid username or password."}
        
    token = create_access_token({"user_id": user["id"], "username": user["username"]})
    
    # Parse stored multi-provider keys
    keys_dict = {"openai": "", "gemini": "", "groq": ""}
    try:
        if user["llm_keys_json"]:
            parsed = json.loads(user["llm_keys_json"])
            if isinstance(parsed, dict):
                for p, k in parsed.items():
                    decrypted = decrypt_api_key(k) if k else ""
                    keys_dict[p] = MASKED_KEY if decrypted else ""
    except Exception:
        pass
    
    # Fallback to active key if present
    active_prov = user["llm_provider"] or "openai"
    raw_active_key = decrypt_api_key(user["llm_api_key"]) if user["llm_api_key"] else ""
    masked_active_key = MASKED_KEY if raw_active_key else ""
    if masked_active_key and not keys_dict.get(active_prov):
        keys_dict[active_prov] = masked_active_key
    
    return {
        "success": True,
        "user_id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "llm_provider": active_prov,
        "llm_api_key": keys_dict.get(active_prov, masked_active_key),
        "keys": keys_dict,
        "token": token
    }

def update_user_llm_config(user_id: int, provider: str, api_key: str, all_keys: dict = None) -> dict:
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT llm_keys_json FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    current_keys = {"openai": "", "gemini": "", "groq": ""}
    if row and row["llm_keys_json"]:
        try:
            parsed = json.loads(row["llm_keys_json"])
            if isinstance(parsed, dict):
                for p, k in parsed.items():
                    current_keys[p] = decrypt_api_key(k) if k else ""
        except Exception:
            pass
            
    if all_keys and isinstance(all_keys, dict):
        for p, k in all_keys.items():
            if k != MASKED_KEY:
                current_keys[p] = k
    else:
        if api_key != MASKED_KEY:
            current_keys[provider] = api_key

    # Encrypt keys for storage
    encrypted_keys_json = json.dumps({
        p: encrypt_api_key(k) if k else "" for p, k in current_keys.items()
    })
    encrypted_active_key = encrypt_api_key(current_keys.get(provider, api_key))
        
    cursor.execute(
        "UPDATE users SET llm_provider = ?, llm_api_key = ?, llm_keys_json = ? WHERE id = ?",
        (provider, encrypted_active_key, encrypted_keys_json, user_id)
    )
    conn.commit()
    conn.close()
    return {
        "success": True,
        "message": "LLM Configuration saved successfully.",
        "provider": provider,
        "keys": {p: (MASKED_KEY if k else "") for p, k in current_keys.items()}
    }

def get_user_llm_config(user_id: int) -> dict:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT llm_provider, llm_api_key, llm_keys_json FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    
    keys_dict = {"openai": "", "gemini": "", "groq": ""}
    if row:
        try:
            if row["llm_keys_json"]:
                parsed = json.loads(row["llm_keys_json"])
                if isinstance(parsed, dict):
                    for p, k in parsed.items():
                        decrypted = decrypt_api_key(k) if k else ""
                        keys_dict[p] = MASKED_KEY if decrypted else ""
        except Exception:
            pass
        active_prov = row["llm_provider"] or "openai"
        raw_key = decrypt_api_key(row["llm_api_key"]) if row["llm_api_key"] else ""
        active_key = keys_dict.get(active_prov) or (MASKED_KEY if raw_key else "")
        return {
            "llm_provider": active_prov,
            "llm_api_key": active_key,
            "keys": keys_dict
        }
    return {"llm_provider": "openai", "llm_api_key": "", "keys": keys_dict}

def find_user_by_query(query: str) -> dict:
    """Finds user by username or email for workspace invites."""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, email FROM users WHERE username = ? OR email = ?", (query.strip(), query.strip()))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None
