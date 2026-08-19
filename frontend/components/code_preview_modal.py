"""
frontend/components/code_preview_modal.py
-----------------------------------------
Renders Source Code Preview with line numbers, highlighted suspicious/risky lines, and reason tooltips.
"""

import streamlit as st
import html

def render_code_preview_modal(file_data: dict):
    file_path = file_data.get("file", "Unknown File")
    source_code = file_data.get("last_source_code", "")
    suspicious_lines = file_data.get("suspicious_lines", [])
    
    st.markdown(f"### 🔍 Code Preview: `{file_path}`")
    
    if suspicious_lines:
        st.warning(f"⚠️ Detected **{len(suspicious_lines)}** suspicious line(s) in this file.")
        with st.expander("Show Suspicious Lines Breakdown", expanded=False):
            for s in suspicious_lines:
                st.markdown(
                    f"- **Line {s['line_number']}** `[{s['severity']}]` ({s['risk_type']}): {s['reason']}\n"
                    f"  ```python\n  {s['line_code'].strip()}\n  ```"
                )
    else:
        st.success("✅ No high-severity suspicious lines detected in static AST scan.")

    if not source_code:
        st.info("Source code text is unavailable for preview.")
        return

    # Render formatted code with line numbers and highlighted suspicious lines
    lines = source_code.splitlines()
    suspicious_map = {s["line_number"]: s for s in suspicious_lines}

    formatted_html = [
        "<div style='font-family: monospace; background-color: #0d1117; padding: 14px; border-radius: 8px; max-height: 500px; overflow-y: auto; border: 1px solid #30363d;'>"
    ]

    for idx, line in enumerate(lines, 1):
        escaped_line = html.escape(line)
        if idx in suspicious_map:
            info = suspicious_map[idx]
            bg_color = "rgba(239, 68, 68, 0.25)" if info['severity'] in ['High', 'Critical'] else "rgba(245, 158, 11, 0.25)"
            border_color = "#ef4444" if info['severity'] in ['High', 'Critical'] else "#f59e0b"
            
            severity = info['severity']
            risk_type = info['risk_type']
            reason = info['reason']
            line_html = (
                f"<div style='background-color: {bg_color}; border-left: 4px solid {border_color}; padding: 2px 6px; margin: 1px 0;' "
                f"title='[Line {idx} - {severity} {risk_type}] {reason}'>"
                f"<span style='color: #8b949e; width: 45px; display: inline-block; user-select: none;'>{idx:4d} | </span>"
                f"<span style='color: #ff7b72; font-weight: bold;'>{escaped_line}</span>"
                f"<span style='float: right; font-size: 0.8em; color: #e3b341;'>⚠️ {html.escape(info['reason'])}</span>"
                f"</div>"
            )
        else:
            line_html = (
                f"<div style='padding: 2px 6px;'>"
                f"<span style='color: #484f58; width: 45px; display: inline-block; user-select: none;'>{idx:4d} | </span>"
                f"<span style='color: #c9d1d9;'>{escaped_line}</span>"
                f"</div>"
            )
        formatted_html.append(line_html)

    formatted_html.append("</div>")
    st.markdown("".join(formatted_html), unsafe_allow_html=True)
