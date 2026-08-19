"""
backend/services/suspicious_line_service.py
---------------------------------------------
Identifies specific suspicious lines or code regions in a source file,
explaining why each line is flagged (current bugs, future development risks, metric anomalies).
"""

import re
import ast

RISKY_PATTERNS = [
    (re.compile(r'\bexcept\s*:\s*'), "Bare `except:` block swallows unexpected exceptions silently.", "Current Bug Risk", "High"),
    (re.compile(r'\beval\s*\('), "Use of `eval()` introduces severe dynamic execution security vulnerabilities.", "Security Vulnerability", "Critical"),
    (re.compile(r'\bexec\s*\('), "Use of `exec()` allows unsafe code execution.", "Security Vulnerability", "Critical"),
    (re.compile(r'\bTODO\b|\bFIXME\b|\bHACK\b|\bXXX\b', re.I), "Unfinished implementation marker indicates potential logic defect or missing edge-case handling.", "Technical Debt", "Medium"),
    (re.compile(r'==\s*None|!=\s*None'), "Comparison with `None` using binary operator instead of `is` / `is not`.", "Code Quality / Type Warning", "Low"),
    (re.compile(r'\b(open|connect|Cursor)\b.*(?!with)'), "Resource allocation without a context manager (`with`) can cause leaks under exceptions.", "Future Risk / Resource Leak", "Medium"),
    (re.compile(r'\bwhile\s+True\s*:'), "Infinite loop pattern `while True:` prone to deadlock if break condition is missed.", "Control Flow Risk", "High"),
    (re.compile(r'\bglobal\s+\w+'), "Global state mutation increases coupling and causes race conditions.", "Future Development Risk", "Medium"),
    (re.compile(r'catch\s*\(\s*Exception\s+\w+\s*\)\s*\{\s*\}', re.I), "Empty catch block suppresses errors without logging.", "Current Bug Risk", "High"),
]

def analyze_suspicious_lines(file_path: str, source_code: str, file_metrics: dict = None) -> list:
    """
    Scans source code line by line and AST nodes (if Python) to detect suspicious code regions.
    Returns a list of dicts: [{line_number, line_code, reason, risk_type, severity}]
    """
    if not source_code:
        return []

    lines = source_code.splitlines()
    suspicious_lines = []
    seen_line_numbers = set()

    # Pattern-based scan
    for idx, line in enumerate(lines, 1):
        stripped = line.strip()
        if not stripped or stripped.startswith('#') or stripped.startswith('//'):
            continue
            
        for pattern, reason, risk_type, severity in RISKY_PATTERNS:
            if pattern.search(line):
                suspicious_lines.append({
                    "line_number": idx,
                    "line_code": line,
                    "reason": reason,
                    "risk_type": risk_type,
                    "severity": severity
                })
                seen_line_numbers.add(idx)

    # AST analysis for Python files
    if file_path.endswith('.py'):
        try:
            tree = ast.parse(source_code)
            for node in ast.walk(tree):
                # Nested loops (high complexity / performance trap)
                if isinstance(node, (ast.For, ast.While)):
                    for child in ast.iter_child_nodes(node):
                        if isinstance(child, (ast.For, ast.While)):
                            line_no = getattr(child, 'lineno', None)
                            if line_no and line_no not in seen_line_numbers and line_no <= len(lines):
                                suspicious_lines.append({
                                    "line_number": line_no,
                                    "line_code": lines[line_no - 1],
                                    "reason": "Nested loop structure significantly increases computational complexity O(n^2+).",
                                    "risk_type": "Future Performance / Complexity Risk",
                                    "severity": "Medium"
                                })
                                seen_line_numbers.add(line_no)

                # Long function bodies
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    func_len = (node.end_lineno - node.lineno) if hasattr(node, 'end_lineno') else 0
                    if func_len > 40 and node.lineno not in seen_line_numbers and node.lineno <= len(lines):
                        suspicious_lines.append({
                            "line_number": node.lineno,
                            "line_code": lines[node.lineno - 1],
                            "reason": f"Large function definition `{node.name}` ({func_len} lines) reduces maintainability.",
                            "risk_type": "High Complexity Risk",
                            "severity": "Medium"
                        })
                        seen_line_numbers.add(node.lineno)
                        
                # Functions with excessive arguments (> 5)
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    arg_count = len(node.args.args)
                    if arg_count > 5 and node.lineno not in seen_line_numbers and node.lineno <= len(lines):
                        suspicious_lines.append({
                            "line_number": node.lineno,
                            "line_code": lines[node.lineno - 1],
                            "reason": f"Function `{node.name}` has {arg_count} parameters, exceeding clean architecture bounds.",
                            "risk_type": "Architectural Coupling Risk",
                            "severity": "Low"
                        })
                        seen_line_numbers.add(node.lineno)
        except Exception:
            pass

    # Sort by line number
    suspicious_lines.sort(key=lambda x: x["line_number"])
    return suspicious_lines
