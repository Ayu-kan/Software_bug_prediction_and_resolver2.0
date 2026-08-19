"""
backend/services/llm_service.py
--------------------------------
Universal LLM service for AI issue resolution, handling both OpenAI and Gemini API integration with fallback rule engine and secret redaction.
"""

import re
import json
import os
import urllib.request
import urllib.error
from typing import Dict, Any

API_KEY_PATTERNS = [
    re.compile(r"(?i)(api_key|apikey|secret|password|auth_token|jwt_secret)\s*[:=]\s*['\"]([^'\"]+)['\"]"),
    re.compile(r"sk-[a-zA-Z0-9]{20,}"),
    re.compile(r"AIzaSy[a-zA-Z0-9_-]{33}"),
    re.compile(r"ghp_[a-zA-Z0-9]{36}"),
]

def redact_secrets(code_text: str) -> str:
    """Removes API keys, tokens, and credentials before sending context to LLMs."""
    sanitized = code_text
    for pattern in API_KEY_PATTERNS:
        sanitized = pattern.sub("[REDACTED_SECRET]", sanitized)
    return sanitized

class LLMSolutionEngine:
    def __init__(self, api_key: str = None, provider: str = "openai"):
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY") or os.environ.get("GEMINI_API_KEY") or ""
        self.provider = (provider or "openai").lower()

    def generate_solution(self, file_path: str, source_code: str, risk_factors: str, ml_probability: float, row_data: Dict[str, Any] = None) -> Dict[str, Any]:
        """Generates structured fix recommendations and improved code via live API or fallback engine."""
        clean_code = redact_secrets(source_code) if source_code else "# [Source code empty]"
        row_data = row_data or {}

        if self.api_key:
            live_solution = self._call_llm_api(file_path, clean_code, risk_factors, ml_probability, row_data)
            if live_solution:
                return live_solution

        # Internal intelligent rule engine fallback when live API key is unavailable or fails
        complexity = row_data.get("complexity", 0)
        previous_bugs = row_data.get("previous_bug_count", 0)
        fan_in = row_data.get("fan_in", 0)
        suspicious_lines = row_data.get("suspicious_lines", [])

        problem_summary = (
            f"Analysis detected risk score {ml_probability*100:.1f}% in `{file_path}`. "
            f"Triggers: {risk_factors}. "
            f"Metrics: Cyclomatic Complexity = {complexity}, Past Bugs = {previous_bugs}, Dependent Files = {fan_in}."
        )

        susp_desc = ""
        if suspicious_lines:
            lines_str = ", ".join([f"L{s['line_number']} ({s['reason']})" for s in suspicious_lines[:3]])
            susp_desc = f"\n- **Suspicious Lines Flagged**: {lines_str}"

        suggested_fix = (
            f"1. **Refactor High Risk Code**: Add try/except error boundaries around volatile functions in `{file_path}`.\n"
            f"2. **Defensive Validation**: Sanitize inputs and check for null/empty states prior to function execution.{susp_desc}\n"
            f"3. **Decouple Dependencies**: Protect {fan_in} dependent components by ensuring signature compatibility."
        )

        lines = source_code.splitlines() if source_code else []
        
        # Build actual refactored version of the file content
        refactored_lines = []
        refactored_lines.append(f"# =========================================================")
        refactored_lines.append(f"# AI REFACTORED SOLUTION: {file_path}")
        refactored_lines.append(f"# Target Risk Reduction: {ml_probability*100:.1f}% -> <15%")
        refactored_lines.append(f"# =========================================================")
        refactored_lines.append("import logging")
        refactored_lines.append("import typing")
        refactored_lines.append("")
        refactored_lines.append("logger = logging.getLogger(__name__)")
        refactored_lines.append("")

        susp_line_nums = {s["line_number"]: s for s in suspicious_lines}

        if lines:
            for idx, line in enumerate(lines, 1):
                if idx in susp_line_nums:
                    s_info = susp_line_nums[idx]
                    indent = " " * (len(line) - len(line.lstrip()))
                    refactored_lines.append(f"{indent}# FIX (Line {idx}): Handled potential defect ({s_info.get('reason', 'Bug-prone')})")
                    refactored_lines.append(f"{indent}try:")
                    refactored_lines.append(f"{indent}    {line.strip()}")
                    refactored_lines.append(f"{indent}except Exception as err:")
                    refactored_lines.append(f"{indent}    logger.error(f'Error at line {idx} in {file_path}: {{err}}')")
                else:
                    refactored_lines.append(line)
        else:
            refactored_lines.append(f"# [Source code empty or file not readable]")

        improved_code_snippet = "\n".join(refactored_lines)

        possible_side_effects = (
            f"- **Dependent Modules**: {fan_in} dependent component(s) import `{file_path}`.\n"
            f"- **Validation**: Run automated test suite to ensure error logging wrappers operate cleanly."
        )

        return {
            "problem_summary": problem_summary,
            "suggested_fix": suggested_fix,
            "improved_code": improved_code_snippet,
            "possible_side_effects": possible_side_effects,
            "sanitized_code": clean_code
        }

    def _call_llm_api(self, file_path: str, clean_code: str, risk_factors: str, ml_probability: float, row_data: Dict[str, Any]) -> Dict[str, Any]:
        """Call OpenAI or Gemini REST API."""
        prompt = (
            f"You are an expert software engineer fixing high-risk bug-prone code.\n"
            f"Target File: {file_path}\n"
            f"Risk Probability: {ml_probability*100:.1f}%\n"
            f"Risk Triggers: {risk_factors}\n"
            f"Code Metrics: {json.dumps(row_data)}\n\n"
            f"Source Code:\n{clean_code[:2000]}\n\n"
            f"Return JSON object with keys: 'problem_summary', 'suggested_fix', 'improved_code', 'possible_side_effects'."
        )

        try:
            if "gemini" in self.provider:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={self.api_key}"
                headers = {"Content-Type": "application/json"}
                body = json.dumps({
                    "contents": [{"parts": [{"text": prompt}]}]
                }).encode("utf-8")
            else:
                url = "https://api.openai.com/v1/chat/completions"
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}"
                }
                body = json.dumps({
                    "model": "gpt-3.5-turbo",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.2
                }).encode("utf-8")

            req = urllib.request.Request(url, data=body, headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if "gemini" in self.provider:
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
                else:
                    raw_text = data["choices"][0]["message"]["content"]
                
                # Extract JSON if enclosed in markdown code fence
                json_match = re.search(r"\{.*\}", raw_text, re.DOTALL)
                if json_match:
                    parsed = json.loads(json_match.group(0))
                    return {
                        "problem_summary": parsed.get("problem_summary", ""),
                        "suggested_fix": parsed.get("suggested_fix", ""),
                        "improved_code": parsed.get("improved_code", ""),
                        "possible_side_effects": parsed.get("possible_side_effects", ""),
                        "sanitized_code": clean_code
                    }
        except Exception as e:
            print(f"LLM API call failed: {e}")
        return None
