"""
backend/auth/auth_service.py
----------------------------
User authentication, token refresh rotation, per-provider encrypted API key persistence,
and user lookup management supporting OpenAI, Google Gemini, Grok (xAI), and Anthropic Claude.
"""

import json
from typing import Optional, Dict, Any
from backend.database.db import get_db
from backend.auth.security import (
    hash_password, verify_password, create_access_token, verify_access_token,
    create_refresh_token, rotate_refresh_token, revoke_token,
    encrypt_api_key, decrypt_api_key,
    check_login_rate_limit, reset_login_attempts
)

MASKED_KEY = '••••••••'
DEFAULT_KEYS = {
    "openai": "",
    "gemini": "",
    "grok": "",
    "anthropic": ""
}

def register_user(username: str, email: str, password: str) -> dict:
    username = (username or "").strip()
    email = (email or "").strip().lower()
    
    if len(username) < 3:
        return {"success": False, "message": "Username must be at least 3 characters."}
    if "@" not in email or "." not in email:
        return {"success": False, "message": "Please enter a valid email address."}
    if len(password) < 6:
        return {"success": False, "message": "Password must be at least 6 characters."}

    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM users WHERE username = ? OR email = ?", (username, email))
    if cursor.fetchone():
        conn.close()
        return {"success": False, "message": "Username or Email already registered."}
        
    pwd_hash = hash_password(password)
    initial_keys = json.dumps(DEFAULT_KEYS)
    cursor.execute(
        "INSERT INTO users (username, email, password_hash, llm_provider, llm_api_key, llm_keys_json) VALUES (?, ?, ?, 'openai', '', ?)",
        (username, email, pwd_hash, initial_keys)
    )
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()
    
    access_token = create_access_token({"user_id": user_id, "username": username})
    refresh_token = create_refresh_token(user_id)

    return {
        "success": True,
        "user_id": user_id,
        "username": username,
        "email": email,
        "token": access_token,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "llm_provider": "openai",
        "llm_api_key": "",
        "keys": DEFAULT_KEYS.copy()
    }

def login_user(username: str, password: str, client_ip: str = "default") -> dict:
    rate_limit_key = f"{client_ip}:{username}"
    if not check_login_rate_limit(rate_limit_key, max_attempts=5, window_seconds=60):
        return {
            "success": False,
            "message": "Too many failed login attempts. Please wait 60 seconds before trying again."
        }

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
        
    reset_login_attempts(rate_limit_key)

    access_token = create_access_token({"user_id": user["id"], "username": user["username"]})
    refresh_token = create_refresh_token(user["id"])
    
    # Parse stored multi-provider keys
    keys_dict = DEFAULT_KEYS.copy()
    try:
        if user["llm_keys_json"]:
            parsed = json.loads(user["llm_keys_json"])
            if isinstance(parsed, dict):
                for p, k in parsed.items():
                    decrypted = decrypt_api_key(k) if k else ""
                    # Handle groq -> grok mapping if present in existing databases
                    canonical_p = "grok" if p == "groq" else p
                    if canonical_p in keys_dict:
                        keys_dict[canonical_p] = MASKED_KEY if decrypted else ""
    except Exception:
        pass
    
    active_prov = user["llm_provider"] or "openai"
    if active_prov == "groq":
        active_prov = "grok"
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
        "token": access_token,
        "access_token": access_token,
        "refresh_token": refresh_token
    }

def refresh_user_token(refresh_token: str) -> dict:
    if not refresh_token:
        return {"success": False, "message": "Refresh token is required."}
    
    rotated = rotate_refresh_token(refresh_token)
    if not rotated:
        return {"success": False, "message": "Invalid, expired, or revoked refresh token. Please log in again."}
        
    return {
        "success": True,
        "access_token": rotated["access_token"],
        "token": rotated["access_token"],
        "refresh_token": rotated["refresh_token"],
        "user_id": rotated["user_id"],
        "username": rotated["username"]
    }

def logout_user(refresh_token: Optional[str]) -> dict:
    if refresh_token:
        revoke_token(refresh_token)
    return {"success": True, "message": "Logged out successfully."}

def update_user_llm_config(user_id: int, provider: str, api_key: str, all_keys: dict = None) -> dict:
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT llm_keys_json, llm_api_key FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    current_keys = DEFAULT_KEYS.copy()
    if row and row["llm_keys_json"]:
        try:
            parsed = json.loads(row["llm_keys_json"])
            if isinstance(parsed, dict):
                for p, k in parsed.items():
                    canonical_p = "grok" if p == "groq" else p
                    if canonical_p in current_keys:
                        current_keys[canonical_p] = decrypt_api_key(k) if k else ""
        except Exception:
            pass
    if row and row["llm_api_key"] and not current_keys.get(provider):
        current_keys[provider] = decrypt_api_key(row["llm_api_key"])
            
    if all_keys and isinstance(all_keys, dict):
        for p, k in all_keys.items():
            canonical_p = "grok" if p == "groq" else p
            if canonical_p in current_keys and k and not k.startswith("••") and k != MASKED_KEY:
                current_keys[canonical_p] = k.strip()
    else:
        canonical_p = "grok" if provider == "groq" else provider
        if api_key and not api_key.startswith("••") and api_key != MASKED_KEY:
            current_keys[canonical_p] = api_key.strip()
        elif api_key == "":
            current_keys[canonical_p] = ""

    # Encrypt keys for storage
    encrypted_keys_json = json.dumps({
        p: encrypt_api_key(k) if k else "" for p, k in current_keys.items()
    })
    active_raw_key = current_keys.get(provider, "")
    encrypted_active_key = encrypt_api_key(active_raw_key)
        
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

def get_user_llm_config(user_id: int, masked: bool = False) -> dict:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT llm_provider, llm_api_key, llm_keys_json FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    
    keys_dict = DEFAULT_KEYS.copy()
    if row:
        active_prov = row["llm_provider"] or "openai"
        if active_prov == "groq":
            active_prov = "grok"
        try:
            if row["llm_keys_json"]:
                parsed = json.loads(row["llm_keys_json"])
                if isinstance(parsed, dict):
                    for p, k in parsed.items():
                        canonical_p = "grok" if p == "groq" else p
                        decrypted = decrypt_api_key(k) if k else ""
                        if canonical_p in keys_dict:
                            keys_dict[canonical_p] = (MASKED_KEY if decrypted else "") if masked else decrypted
        except Exception:
            pass
            
        raw_key = decrypt_api_key(row["llm_api_key"]) if row["llm_api_key"] else ""
        if not keys_dict.get(active_prov) and raw_key:
            keys_dict[active_prov] = MASKED_KEY if masked else raw_key

        if masked:
            active_key = keys_dict.get(active_prov) or (MASKED_KEY if raw_key else "")
        else:
            active_key = keys_dict.get(active_prov) or raw_key

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

