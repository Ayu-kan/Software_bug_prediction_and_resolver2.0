"""
src/ml/repair/patch_generator.py
--------------------------------
Automated ML & AST Rule-Guided Bug Repair Candidate Generator.
Strictly produces genuine code transformations and candidate diffs.
If no suitable repair model or transformation pattern exists, reports unavailable.
"""

import ast
import re
import difflib
from typing import Dict, Any, Optional, Tuple


class BugPatchGenerator:
    """Generates candidate patches for verified defect patterns using AST / pattern transformation."""

    def __init__(self):
        pass

    def generate_candidate(
        self,
        file_path: str,
        source_code: str,
        risk_cause: Optional[str] = None
    ) -> Dict[str, Any]:
        return self.generate_candidate_patch(file_path, source_code, risk_cause)

    def generate_candidate_patch(
        self,
        file_path: str,
        source_code: str,
        risk_cause: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Inspects source code for repairable bug patterns and generates a candidate patch.
        Returns a structured result with candidate code and unified diff.
        """
        if not source_code or not source_code.strip():
            return {
                "available": False,
                "message": "Empty or unavailable source code; cannot generate candidate patch."
            }

        lines = source_code.splitlines(keepends=True)
        patched_lines = list(lines)
        transformations_applied = []

        # 1. Bare except repair: replace 'except:' with 'except Exception as e:'
        bare_except_pattern = re.compile(r"^(\s*)except\s*:\s*(#.*)?$")
        for i, line in enumerate(patched_lines):
            match = bare_except_pattern.match(line)
            if match:
                indent = match.group(1)
                comment = match.group(2) or ""
                patched_lines[i] = f"{indent}except Exception as err:  # Patched: specific exception catch {comment}\n"
                transformations_applied.append("Replaced bare `except:` with explicit `except Exception as err:`")

        # 2. Dynamic eval replacement with safe ast.literal_eval
        if "eval(" in source_code and not "ast.literal_eval" in source_code:
            eval_pattern = re.compile(r"\beval\(([^)]+)\)")
            for i, line in enumerate(patched_lines):
                if "eval(" in line and "ast.literal_eval" not in line:
                    patched_lines[i] = eval_pattern.sub(r"ast.literal_eval(\1)", line)
                    transformations_applied.append("Replaced unsafe `eval()` with `ast.literal_eval()`")

            # Ensure ast import is present
            if transformations_applied and not any("import ast" in l for l in patched_lines):
                patched_lines.insert(0, "import ast  # Patched for safe literal evaluation\n")

        # 3. Potentially unhandled ZeroDivisionError
        div_pattern = re.compile(r"^(\s*)([a-zA-Z_]\w*\s*=\s*[^/]+)/(\s*([a-zA-Z_]\w*))\s*$")
        for i, line in enumerate(patched_lines):
            match = div_pattern.match(line.rstrip())
            if match and "if " not in patched_lines[max(0, i - 1)]:
                indent = match.group(1)
                expr = match.group(2)
                divisor = match.group(4)
                if divisor not in ("1", "2", "10", "100"):
                    patched_lines[i] = (
                        f"{indent}if {divisor} != 0:\n"
                        f"{indent}    {expr.strip()} / {divisor}\n"
                        f"{indent}else:\n"
                        f"{indent}    {expr.strip()} = 0  # Patched: ZeroDivision safety guard\n"
                    )
                    transformations_applied.append(f"Added non-zero guard check for divisor `{divisor}`")

        # 4. Potentially unclosed resource open()
        open_assign_pattern = re.compile(r"^(\s*)([a-zA-Z_]\w*)\s*=\s*open\(([^)]+)\)\s*$")
        for i, line in enumerate(patched_lines):
            match = open_assign_pattern.match(line.rstrip())
            if match and not any("with open" in l for l in patched_lines[max(0, i-2):i+2]):
                indent = match.group(1)
                var_name = match.group(2)
                args = match.group(3)
                patched_lines[i] = f"{indent}with open({args}) as {var_name}:  # Patched: context-managed resource\n"
                transformations_applied.append(f"Wrapped file resource `{var_name}` with context manager (`with open(...)`)")

        # If no repair transformation was triggered
        if not transformations_applied:
            return {
                "available": False,
                "message": (
                    "No ML-based automated repair model or verified patch rule exists for this specific defect pattern. "
                    "Manual engineer review and specialized test synthesis required."
                ),
                "risk_factors": risk_cause
            }

        candidate_code = "".join(patched_lines)
        
        # Generate unified diff
        orig_split = source_code.splitlines(keepends=True)
        cand_split = candidate_code.splitlines(keepends=True)
        diff_lines = list(difflib.unified_diff(
            orig_split, cand_split,
            fromfile=f"a/{file_path}",
            tofile=f"b/{file_path}",
            lineterm=""
        ))
        diff_text = "\n".join(diff_lines)

        return {
            "available": True,
            "candidate_code": candidate_code,
            "diff": diff_text,
            "transformations": transformations_applied,
            "message": f"Generated candidate repair ({len(transformations_applied)} transformations applied)."
        }
