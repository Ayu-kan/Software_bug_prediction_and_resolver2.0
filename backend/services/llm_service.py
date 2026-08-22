"""
backend/services/llm_service.py
--------------------------------
Universal LLM service supporting OpenAI, Google Gemini, and Groq.
All AI requests MUST use the API key provided by the authenticated user.
No server-side, developer, default, fallback, or environment-variable keys are ever used.
"""

import re
import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

API_KEY_PATTERNS = [
    re.compile(r"(?i)(api_key|apikey|secret|password|auth_token|jwt_secret)\s*[:=]\s*['\"]([^'\"]+)['\"]"),
    re.compile(r"sk-[a-zA-Z0-9]{20,}"),
    re.compile(r"AIzaSy[a-zA-Z0-9_-]{33}"),
    re.compile(r"ghp_[a-zA-Z0-9]{36}"),
    re.compile(r"gsk_[a-zA-Z0-9]{40,}"),
]

# Provider-specific defaults
PROVIDER_DEFAULTS = {
    "openai": {
        "url": "https://api.openai.com/v1/chat/completions",
        "default_model": "gpt-4o",
        "models": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
        "key_prefix": "sk-",
    },
    "gemini": {
        "url": "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        "default_model": "gemini-2.0-flash",
        "models": ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.5-flash", "gemini-1.5-flash-8b"],
        "key_prefix": "AIzaSy",
    },
    "groq": {
        "url": "https://api.groq.com/openai/v1/chat/completions",
        "default_model": "llama-3.1-8b-instant",
        "models": ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
        "key_prefix": "gsk_",
    },
}

ERROR_MESSAGES = {
    "api_key_required": "No API key configured. Please add your API key in Settings.",
    "invalid_api_key": "The API key provided is invalid or expired.",
    "auth_failed": "Authentication failed. Check your API key.",
    "rate_limit": "Rate limit exceeded. Please wait a moment and try again.",
    "model_unavailable": "The selected model is unavailable. Try a different model.",
    "network_error": "Network connection failed. Check your internet connection.",
    "provider_error": "The AI provider returned an unexpected error.",
    "generation_failed": "AI generation failed. Please try again.",
}


def redact_secrets(code_text: str) -> str:
    """Removes API keys, tokens, and credentials before sending context to LLMs."""
    sanitized = code_text
    for pattern in API_KEY_PATTERNS:
        sanitized = pattern.sub("[REDACTED_SECRET]", sanitized)
    return sanitized


def _classify_error(status_code: int, body: str) -> str:
    """Map HTTP status codes and response bodies to user-friendly error messages."""
    if body:
        try:
            parsed = json.loads(body)
            if isinstance(parsed, dict) and "error" in parsed:
                err = parsed["error"]
                if isinstance(err, dict) and "message" in err:
                    return str(err["message"])
                elif isinstance(err, str):
                    return err
        except Exception:
            pass

    if status_code in (401, 400):
        return ERROR_MESSAGES["invalid_api_key"]
    if status_code == 403:
        return ERROR_MESSAGES["auth_failed"]
    if status_code == 429:
        return ERROR_MESSAGES["rate_limit"]
    if status_code == 404:
        return ERROR_MESSAGES["model_unavailable"]
    if status_code >= 500:
        return ERROR_MESSAGES["provider_error"]
    return ERROR_MESSAGES["generation_failed"]


class LLMSolutionEngine:
    def __init__(self, api_key: str = None, provider: str = "openai", model: str = None):
        # CRITICAL: No fallback to environment variables. 
        # Only the key explicitly provided by the authenticated user is used.
        self.api_key = (api_key or "").strip()
        self.provider = (provider or "openai").lower()
        provider_cfg = PROVIDER_DEFAULTS.get(self.provider, PROVIDER_DEFAULTS["openai"])
        self.model = (model or "").strip() or provider_cfg["default_model"]
        if self.provider == "gemini" and self.model == "gemini-pro":
            self.model = "gemini-1.5-flash"

    def has_api_key(self) -> bool:
        return bool(self.api_key)

    def test_connection(self) -> Dict[str, Any]:
        """
        Validates the API key with a minimal ping request.
        Returns {"success": bool, "provider": str, "model": str, "error": str | None}
        """
        if not self.api_key:
            return {"success": False, "error": ERROR_MESSAGES["api_key_required"]}

        ping_prompt = "Reply with exactly: OK"
        try:
            result = self._make_api_request(ping_prompt, max_tokens=10)
            if result is None:
                return {"success": False, "error": ERROR_MESSAGES["generation_failed"]}
            return {"success": True, "provider": self.provider, "model": self.model, "error": None}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def generate_solution(
        self,
        file_path: str,
        source_code: str,
        risk_factors: str,
        ml_probability: float,
        row_data: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Generates structured fix recommendations via the user's configured LLM API.
        Returns an error dict if no API key is configured — no silent rule-based fallback.
        """
        if not self.api_key:
            return {
                "error": "api_key_required",
                "message": ERROR_MESSAGES["api_key_required"],
                "provider": self.provider
            }

        clean_code = redact_secrets(source_code) if source_code else "# [Source code empty]"
        row_data = row_data or {}

        prompt = (
            f"You are an expert software engineer. Analyze this high-risk file and provide a fix.\n"
            f"File: {file_path}\n"
            f"Risk Score: {ml_probability * 100:.1f}%\n"
            f"Risk Triggers: {risk_factors}\n"
            f"Metrics: {json.dumps({k: row_data.get(k) for k in ['complexity', 'loc', 'previous_bug_count', 'fan_in'] if k in row_data})}\n\n"
            f"Source Code:\n{clean_code[:3000]}\n\n"
            f"Return a JSON object with these exact keys:\n"
            f"- problem_summary: Brief description of the detected risk\n"
            f"- suggested_fix: Step-by-step fix recommendations (markdown)\n"
            f"- improved_code: The complete refactored source file\n"
            f"- possible_side_effects: Warnings about dependent components\n"
        )

        try:
            raw_text = self._make_api_request(prompt)
            if raw_text is None:
                return {"error": "generation_failed", "message": ERROR_MESSAGES["generation_failed"]}

            # Extract JSON from markdown code fence if present
            json_match = re.search(r"\{.*\}", raw_text, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group(0))
                return {
                    "problem_summary": parsed.get("problem_summary", ""),
                    "suggested_fix": parsed.get("suggested_fix", ""),
                    "improved_code": parsed.get("improved_code", ""),
                    "possible_side_effects": parsed.get("possible_side_effects", ""),
                    "sanitized_code": clean_code,
                    "provider": self.provider,
                    "model": self.model,
                }
            # If LLM returned plain text (not JSON), wrap it
            return {
                "problem_summary": f"AI analysis for {file_path} (Risk: {ml_probability*100:.1f}%)",
                "suggested_fix": raw_text,
                "improved_code": clean_code,
                "possible_side_effects": "Review all dependent modules after applying changes.",
                "sanitized_code": clean_code,
                "provider": self.provider,
                "model": self.model,
            }
        except Exception as e:
            return {"error": "generation_failed", "message": f"{ERROR_MESSAGES['generation_failed']} ({str(e)})"}

    def _make_gemini_request(self, prompt: str, max_tokens: int = 2048) -> str:
        """
        Executes a Gemini API request with automatic model discovery from ListModels,
        per-key model validation, and fallback handling.
        """
        clean_key = (self.api_key or "").strip().strip('"').strip("'")
        if not clean_key:
            raise Exception(ERROR_MESSAGES["api_key_required"])

        raw_model = (self.model or "gemini-2.0-flash").strip()
        if raw_model.startswith("models/"):
            raw_model = raw_model[len("models/"):]
        if raw_model in ["gemini-pro", "gemini-pro-vision"]:
            raw_model = "gemini-2.0-flash"

        headers = {"Content-Type": "application/json"}
        body = json.dumps({
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": max_tokens, "temperature": 0.2}
        }).encode("utf-8")

        # Step 1: Query ListModels to find exactly which models are supported by this API key
        available_models = []
        try:
            list_url = f"https://generativelanguage.googleapis.com/v1beta/models?key={clean_key}"
            req_list = urllib.request.Request(list_url, method="GET")
            with urllib.request.urlopen(req_list, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                for m in data.get("models", []):
                    methods = m.get("supportedGenerationMethods", [])
                    if "generateContent" in methods:
                        m_name = m.get("name", "").replace("models/", "")
                        if m_name and m_name not in available_models:
                            available_models.append(m_name)
        except urllib.error.HTTPError as e:
            body_text = ""
            try:
                body_text = e.read().decode("utf-8")
            except Exception:
                pass
            if e.code in (400, 401, 403) or "API_KEY_INVALID" in body_text or "API key not valid" in body_text:
                raise Exception(_classify_error(e.code, body_text))
        except Exception:
            pass

        # Step 2: Build candidate list prioritizing user's selection and discovered available models
        candidates = []
        if raw_model:
            candidates.append(raw_model)
        for m in available_models:
            if m not in candidates:
                candidates.append(m)
        for fallback in ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.5-flash", "gemini-1.5-flash-8b"]:
            if fallback not in candidates:
                candidates.append(fallback)

        last_error = None
        for cand in candidates:
            for api_version in ["v1beta", "v1"]:
                url = f"https://generativelanguage.googleapis.com/{api_version}/models/{cand}:generateContent?key={clean_key}"
                try:
                    req = urllib.request.Request(url, data=body, headers=headers, method="POST")
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        data = json.loads(resp.read().decode("utf-8"))
                        cand_list = data.get("candidates", [])
                        if not cand_list:
                            prompt_feedback = data.get("promptFeedback", {})
                            block_reason = prompt_feedback.get("blockReason")
                            if block_reason:
                                raise Exception(f"Gemini blocked the request: {block_reason}")
                            raise Exception("Gemini returned empty candidates.")
                        
                        parts = cand_list[0].get("content", {}).get("parts", [])
                        if not parts:
                            finish_reason = cand_list[0].get("finishReason")
                            if finish_reason:
                                raise Exception(f"Gemini stopped generation: {finish_reason}")
                            raise Exception("Gemini response contained no content.")
                        
                        # Cache the successful model
                        self.model = cand
                        return parts[0].get("text", "")
                except urllib.error.HTTPError as e:
                    body_text = ""
                    try:
                        body_text = e.read().decode("utf-8")
                    except Exception:
                        pass
                    if e.code == 404 or "not found" in body_text.lower() or "not supported" in body_text.lower():
                        last_error = _classify_error(e.code, body_text)
                        continue
                    raise Exception(_classify_error(e.code, body_text))
                except Exception as ex:
                    last_error = str(ex)
                    continue

        raise Exception(last_error or "Unable to generate content with the provided Gemini API key. Please verify your API key in Settings.")

    def _make_api_request(self, prompt: str, max_tokens: int = 2048) -> Optional[str]:
        """
        Routes the request to the correct provider and returns the raw text response.
        Raises a descriptive exception on HTTP errors.
        """
        if self.provider == "gemini":
            return self._make_gemini_request(prompt, max_tokens)

        try:
            # OpenAI and Groq share the same API format
            provider_cfg = PROVIDER_DEFAULTS.get(self.provider, PROVIDER_DEFAULTS["openai"])
            url = provider_cfg["url"]
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
            body = json.dumps({
                "model": self.model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
                "max_tokens": max_tokens
            }).encode("utf-8")

            req = urllib.request.Request(url, data=body, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                choices = data.get("choices", [])
                if not choices:
                    raise Exception("AI provider returned empty choices.")
                return choices[0]["message"]["content"]

        except urllib.error.HTTPError as e:
            body_text = ""
            try:
                body_text = e.read().decode("utf-8")
            except Exception:
                pass
            error_msg = _classify_error(e.code, body_text)
            raise Exception(error_msg)
        except urllib.error.URLError:
            raise Exception(ERROR_MESSAGES["network_error"])
        except Exception as e:
            raise Exception(str(e))
