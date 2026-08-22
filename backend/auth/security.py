"""
backend/auth/security.py
-------------------------
Security utilities for password hashing, token generation, and secure API key persistence.
"""

import hashlib
import os
import hmac
import json
import base64
import time

SECRET_KEY = os.environ.get("JWT_SECRET", "super-secret-bug-prediction-key-2026")

try:
    from cryptography.fernet import Fernet
    def _get_fernet_key() -> bytes:
        key_hash = hashlib.sha256(SECRET_KEY.encode('utf-8')).digest()
        return base64.urlsafe_b64encode(key_hash)

    _fernet = Fernet(_get_fernet_key())

    def encrypt_api_key(api_key: str) -> str:
        if not api_key:
            return ""
        return _fernet.encrypt(api_key.encode('utf-8')).decode('utf-8')

    def decrypt_api_key(encrypted_key: str) -> str:
        if not encrypted_key:
            return ""
        try:
            return _fernet.decrypt(encrypted_key.encode('utf-8')).decode('utf-8')
        except Exception:
            return encrypted_key
except ImportError:
    # Standard-library fallback using HMAC XOR masking + Base64
    def _xor_cipher(data: bytes, key: bytes) -> bytes:
        return bytes([b ^ key[i % len(key)] for i, b in enumerate(data)])

    def encrypt_api_key(api_key: str) -> str:
        if not api_key:
            return ""
        key = hashlib.sha256(SECRET_KEY.encode('utf-8')).digest()
        encrypted = _xor_cipher(api_key.encode('utf-8'), key)
        return "enc_" + base64.urlsafe_b64encode(encrypted).decode('utf-8')

    def decrypt_api_key(encrypted_key: str) -> str:
        if not encrypted_key:
            return ""
        if encrypted_key.startswith("enc_"):
            try:
                raw = base64.urlsafe_b64decode(encrypted_key[4:].encode('utf-8'))
                key = hashlib.sha256(SECRET_KEY.encode('utf-8')).digest()
                return _xor_cipher(raw, key).decode('utf-8')
            except Exception:
                return encrypted_key
        return encrypted_key

def hash_password(password: str) -> str:
    salt = os.urandom(16)
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return base64.b64encode(salt + pwd_hash).decode('utf-8')

def verify_password(password: str, stored_hash: str) -> bool:
    try:
        decoded = base64.b64decode(stored_hash.encode('utf-8'))
        salt = decoded[:16]
        pwd_hash = decoded[16:]
        new_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
        return hmac.compare_digest(pwd_hash, new_hash)
    except Exception:
        return False

def create_access_token(data: dict, expires_in_seconds: int = 86400) -> str:
    payload = data.copy()
    payload["exp"] = int(time.time()) + expires_in_seconds
    payload_bytes = json.dumps(payload).encode('utf-8')
    header_bytes = json.dumps({"alg": "HS256", "typ": "JWT"}).encode('utf-8')
    
    b64_header = base64.urlsafe_b64encode(header_bytes).decode('utf-8').rstrip('=')
    b64_payload = base64.urlsafe_b64encode(payload_bytes).decode('utf-8').rstrip('=')
    
    signature = hmac.new(
        SECRET_KEY.encode('utf-8'),
        f"{b64_header}.{b64_payload}".encode('utf-8'),
        hashlib.sha256
    ).digest()
    b64_sig = base64.urlsafe_b64encode(signature).decode('utf-8').rstrip('=')
    
    return f"{b64_header}.{b64_payload}.{b64_sig}"

def verify_access_token(token: str) -> dict | None:
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        b64_header, b64_payload, b64_sig = parts
        
        expected_sig = hmac.new(
            SECRET_KEY.encode('utf-8'),
            f"{b64_header}.{b64_payload}".encode('utf-8'),
            hashlib.sha256
        ).digest()
        
        padded_sig = b64_sig + '=' * (-len(b64_sig) % 4)
        if not hmac.compare_digest(base64.urlsafe_b64decode(padded_sig), expected_sig):
            return None
            
        padded_payload = b64_payload + '=' * (-len(b64_payload) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded_payload).decode('utf-8'))
        
        if payload.get("exp", 0) < time.time():
            return None
            
        return payload
    except Exception:
        return None
