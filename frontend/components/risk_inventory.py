"""
frontend/components/risk_inventory.py
--------------------------------------
Complete Ranked Risk Inventory Table component featuring action buttons for Code Preview and LLM Resolution.
"""

import streamlit as st
import pandas as pd
from frontend.services.api_service import BackendAPIService

def render_risk_inventory(files_list: list, user_id: int):
    st.subheader("📋 Complete Ranked Risk Inventory")
    
    if not files_list:
        st.info("No files found matching the current mode criteria.")
        return

    # Table layout dataframe (EXCLUDING Churn column)
    table_rows = []
    for f in files_list:
        prob = f.get("ml_probability", 0) * 100
        table_rows.append({
            "Rank": f"#{f.get('rank', '-')}",
            "File Path": f.get("file", ""),
            "ML Probability": f"{prob:.1f}%",
            "Risk Level": f.get("risk_level", "Medium"),
            "Suspicious Lines": f"⚠️ {f.get('suspicious_count', 0)} line(s)" if f.get('suspicious_count', 0) > 0 else "Clean ✅",
            "Why File Is Risky": f.get("risk_cause_description", "N/A"),
            "Architecture Role": f.get("architecture_role", "Module")
        })

    df_display = pd.DataFrame(table_rows)
    st.dataframe(df_display, use_container_width=True, hide_index=True)

    st.markdown("### ⚡ Interactive File Actions")
    st.caption("Select a file from the inventory to preview highlighted source code or generate an AI fix solution directly.")

    file_options = [f.get("file") for f in files_list]
    
    # Preserve selected file in session_state to avoid view reset on click
    if "selected_inventory_file" not in st.session_state or st.session_state.selected_inventory_file not in file_options:
        st.session_state.selected_inventory_file = file_options[0] if file_options else None

    sel_col1, sel_col2, sel_col3 = st.columns([3, 1, 1])
    with sel_col1:
        chosen_file = st.selectbox(
            "Target File",
            options=file_options,
            key="inventory_file_selector"
        )
        st.session_state.selected_inventory_file = chosen_file

    target_data = next((f for f in files_list if f.get("file") == chosen_file), None)

    with sel_col2:
        if st.button("🔍 Preview Code", key="inv_preview_btn", use_container_width=True):
            st.session_state.active_action = "preview"

    with sel_col3:
        if st.button("🤖 Resolve with AI", key="inv_resolve_btn", type="primary", use_container_width=True):
            st.session_state.active_action = "resolve"

    # Action Display Area (Updates state dynamically without full page reload)
    if target_data and st.session_state.get("active_action") == "preview":
        st.divider()
        from frontend.components.code_preview_modal import render_code_preview_modal
        render_code_preview_modal(target_data)

    elif target_data and st.session_state.get("active_action") == "resolve":
        st.divider()
        st.subheader(f"🤖 LLM Issue Resolution for `{target_data['file']}`")
        
        with st.spinner("Generating solution with configured LLM engine..."):
            res = BackendAPIService.resolve_issue(
                file_path=target_data["file"],
                source_code=target_data.get("last_source_code", ""),
                risk_factors=target_data.get("risk_cause_description", ""),
                ml_probability=target_data.get("ml_probability", 0.5),
                user_id=user_id,
                row_data=target_data
            )
            
        if res.get("success"):
            sol = res["solution"]
            st.info(f"**Diagnosis & Cause:** {sol['problem_summary']}")
            st.markdown(f"**Suggested Solution:**\n{sol['suggested_fix']}")
            st.subheader("🛠️ AI Refactored Code Fix:")
            st.code(sol["improved_code"], language="python")
            st.warning(f"**Potential Side Effects:**\n{sol['possible_side_effects']}")
        else:
            st.error("Failed to generate solution. Check API key configuration.")
