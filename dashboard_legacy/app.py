"""
dashboard/app.py
-----------------
Enterprise Bug Risk Intelligence Platform Dashboard
Integrates Modular Frontend Components and Backend REST/Service Architecture.
"""

import os
import sys
import pandas as pd
import streamlit as st

# Setup paths for backend and frontend modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from frontend.components.auth_ui import render_auth_section
from frontend.components.api_key_modal import render_api_key_config_button
from frontend.components.file_ranking import render_file_ranking
from frontend.components.risk_inventory import render_risk_inventory
from frontend.services.api_service import BackendAPIService

st.set_page_config(page_title="Bug Risk Intelligence Platform", layout="wide", page_icon="🐞")

# Modern Styling System
st.markdown("""
    <style>
    .stApp {
        background-color: #0f172a;
        color: #f8fafc;
    }
    .metric-card {
        background: rgba(30, 41, 59, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 16px;
        text-align: center;
    }
    .stButton>button {
        border-radius: 8px;
    }
    </style>
""", unsafe_allow_html=True)

# Main Application Title & Subtitle
st.title("🐞 Enterprise Bug Risk Intelligence Platform")
st.caption("AI-Powered Multi-Language Code Analysis, Hybrid Risk Scoring & LLM Solution Generation")

# Step 1: Authentication Check (Requirement 8)
is_authenticated = render_auth_section()
if not is_authenticated:
    st.stop()

user_info = st.session_state.user
user_id = user_info["user_id"]

# Top Header Toolbar with Dedicated API Key / LLM Config Button (Requirement 2)
toolbar_c1, toolbar_c2 = st.columns([3, 1])
with toolbar_c2:
    render_api_key_config_button(user_id)

st.divider()

# Navigation Tabs
tabs = st.tabs(["🚀 Repository Analysis", "📜 Analysis History", "⚙️ System Specs"])

with tabs[0]:
    st.subheader("🔎 Analyze Repository")
    
    analysis_c1, analysis_c2 = st.columns([3, 1])
    with analysis_c1:
        repo_input = st.text_input(
            "Repository Directory Path or GitHub URL",
            placeholder="e.g. F:\\MyProject OR https://github.com/owner/repo",
            key="repo_path_input"
        )
    with analysis_c2:
        analysis_mode = st.selectbox(
            "Analysis View Mode",
            ["Normal Mode (All Files)", "Hybrid Mode (Risk > 60%)"],
            help="Hybrid Mode filters results to only show files with risk probability > 60%."
        )

    run_analysis_btn = st.button("⚡ Run Deep Analysis", type="primary", use_container_width=True)

    if run_analysis_btn:
        if not repo_input.strip():
            st.error("Please enter a valid repository path or GitHub URL.")
        else:
            with st.spinner("Extracting code features, running ML predictions & suspicious line detection..."):
                res = BackendAPIService.run_analysis(repo_input.strip(), user_id=user_id, analysis_mode=analysis_mode)
                if res.get("success"):
                    st.session_state.analysis_results = res
                    st.session_state.active_action = None
                    st.success("Analysis complete!")
                    st.rerun()
                else:
                    st.error(res.get("error", "Analysis failed."))

    # Display Analysis Results if present in session_state (Prevents state resets, Requirement 3)
    if "analysis_results" in st.session_state and st.session_state.analysis_results:
        res = st.session_state.analysis_results
        
        # Determine file list based on Analysis Mode (Requirement 7)
        if "Hybrid Mode" in analysis_mode:
            display_files = res.get("hybrid_mode_files", [])
            st.info(f"⚡ **Hybrid Mode Active**: Displaying **{len(display_files)}** files with ML Bug Risk > 60%.")
        else:
            display_files = res.get("all_ranked_files", [])

        # Summary Metrics
        st.subheader("📊 Repository Risk Summary")
        m1, m2, m3, m4 = st.columns(4)
        with m1:
            st.metric("Total Files Analyzed", res.get("total_files", 0))
        with m2:
            st.metric("🔴 High Risk (≥70%)", res.get("high_risk_count", 0))
        with m3:
            med_cnt = sum(1 for f in display_files if 40 <= f.get("ml_probability", 0)*100 < 70)
            st.metric("🟡 Medium Risk (40-69%)", med_cnt)
        with m4:
            avg_prob = (sum(f.get("ml_probability", 0) for f in display_files) / max(len(display_files), 1)) * 100
            st.metric("Avg ML Risk Prob", f"{avg_prob:.1f}%")

        st.divider()

        # Requirement 9: Top 10 File Ranking
        render_file_ranking(res.get("top_10_files", []))

        st.divider()

        # Requirement 4, 10: Complete Ranked Risk Inventory without Churn
        render_risk_inventory(display_files, user_id=user_id)
    else:
        st.info("💡 No previous analysis found. Upload a repository or enter a GitHub repository URL to begin.")

with tabs[1]:
    st.subheader("📜 Historical Repository Analyses")
    history_res = BackendAPIService.get_user_history(user_id)
    history_rows = history_res.get("history", [])
    
    if history_rows:
        for item in history_rows:
            h_col1, h_col2, h_col3, h_col4, h_col5, h_col6 = st.columns([3, 2, 2, 2, 2, 2])
            with h_col1:
                st.write(f"📁 **{item['repo_name']}**")
            with h_col2:
                st.write(f"⚙️ {item.get('analysis_mode', 'Normal')}")
            with h_col3:
                st.write(f"📄 {item['total_files']} files")
            with h_col4:
                st.write(f"🔴 {item['high_risk_count']} high risk")
            with h_col5:
                if st.button("📂 Open", key=f"open_hist_{item['id']}", use_container_width=True):
                    detail_res = BackendAPIService.get_analysis_details(item['id'], user_id)
                    if detail_res.get("success"):
                        st.session_state.analysis_results = detail_res["data"]
                        st.session_state.active_action = None
                        st.success(f"Loaded analysis for {item['repo_name']}")
                        st.rerun()
                    else:
                        st.error(detail_res.get("error", "Failed to load analysis."))
            with h_col6:
                if st.button("🗑️ Delete", key=f"del_hist_{item['id']}", use_container_width=True):
                    del_res = BackendAPIService.delete_analysis(item['id'], user_id)
                    if del_res.get("success"):
                        if st.session_state.get("analysis_results", {}).get("analysis_id") == item['id']:
                            del st.session_state["analysis_results"]
                        st.success("Deleted analysis record.")
                        st.rerun()
                    else:
                        st.error(del_res.get("error", "Failed to delete."))
            st.divider()
    else:
        st.info("No past repository analysis history found for your account.")

with tabs[2]:
    st.subheader("⚙️ System & Architecture Specs")
    st.json({
        "Frontend": "Modular Component System (services, pages, components)",
        "Backend": "Python FastAPI & Modular Services Architecture",
        "Database": "SQLite with Encrypted User API Key Persistence",
        "ML Predictor": "Random Forest / XGBoost / Logistic Regression Ensemble",
        "Hybrid Mode Threshold": "Risk Probability > 60%",
        "LLM Providers Supported": ["OpenAI (GPT-3.5/4)", "Google Gemini Pro"]
    })
