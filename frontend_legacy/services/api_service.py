"""
frontend/services/api_service.py
---------------------------------
Service wrapper connecting frontend components to backend API services.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from backend.api.app import (
    handle_register, handle_login, handle_config, 
    handle_analysis, handle_resolve,
    handle_get_latest_analysis, handle_get_user_history,
    handle_get_analysis_details, handle_delete_analysis,
    RegisterRequest, LoginRequest, ConfigRequest, ResolveRequest
)
from backend.auth.auth_service import get_user_llm_config

class BackendAPIService:
    @staticmethod
    def register(username: str, email: str, password: str) -> dict:
        req = RegisterRequest(username=username, email=email, password=password)
        return handle_register(req)

    @staticmethod
    def login(username: str, password: str) -> dict:
        req = LoginRequest(username=username, password=password)
        return handle_login(req)

    @staticmethod
    def save_llm_config(user_id: int, provider: str, api_key: str) -> dict:
        req = ConfigRequest(user_id=user_id, provider=provider, api_key=api_key)
        return handle_config(req)

    @staticmethod
    def get_llm_config(user_id: int) -> dict:
        return get_user_llm_config(user_id)

    @staticmethod
    def run_analysis(repo_path: str, user_id: int, analysis_mode: str = "Normal Mode (All Files)") -> dict:
        return handle_analysis(repo_path, user_id, analysis_mode)

    @staticmethod
    def get_latest_analysis(user_id: int) -> dict:
        return handle_get_latest_analysis(user_id)

    @staticmethod
    def get_user_history(user_id: int) -> dict:
        return handle_get_user_history(user_id)

    @staticmethod
    def get_analysis_details(analysis_id: int, user_id: int) -> dict:
        return handle_get_analysis_details(analysis_id, user_id)

    @staticmethod
    def delete_analysis(analysis_id: int, user_id: int) -> dict:
        return handle_delete_analysis(analysis_id, user_id)

    @staticmethod
    def resolve_issue(file_path: str, source_code: str, risk_factors: str, ml_probability: float, user_id: int, row_data: dict) -> dict:
        req = ResolveRequest(
            file_path=file_path,
            source_code=source_code,
            risk_factors=risk_factors,
            ml_probability=ml_probability,
            user_id=user_id,
            row_data=row_data
        )
        return handle_resolve(req)
