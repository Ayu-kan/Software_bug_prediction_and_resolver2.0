"""
frontend/components/file_ranking.py
------------------------------------
File Ranking UI Component displaying Top 10 highest-risk files.
"""

import pandas as pd
import streamlit as st

def render_file_ranking(top_10_files: list):
    st.subheader("🏆 Top 10 Highest Risk File Ranking")
    st.caption("Files ranked from highest to lowest based on ML bug prediction probability.")
    
    if not top_10_files:
        st.info("No analysis data available.")
        return

    table_data = []
    for item in top_10_files:
        prob = item.get("ml_probability", 0) * 100
        table_data.append({
            "Rank": f"#{item.get('rank', '-')}",
            "File Path": item.get("file", ""),
            "ML Bug Probability": f"{prob:.1f}%",
            "Risk Level": item.get("risk_level", "Medium"),
            "Architecture Role": item.get("architecture_role", "Module"),
            "Suspicious Lines": item.get("suspicious_count", 0)
        })

    df_rank = pd.DataFrame(table_data)
    st.dataframe(df_rank, use_container_width=True, hide_index=True)
