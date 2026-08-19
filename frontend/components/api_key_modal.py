"""
frontend/components/api_key_modal.py
------------------------------------
Dedicated API Key & LLM Configuration modal / drawer component.
"""

import streamlit as st
from frontend.services.api_service import BackendAPIService

def render_api_key_config_button(user_id: int):
    config = BackendAPIService.get_llm_config(user_id)
    has_key = bool(config.get("llm_api_key"))
    
    status_label = f"⚙️ LLM Configuration ({config.get('llm_provider', 'openai').upper()}: {'Key Set ✅' if has_key else 'No Key ⚠️'})"
    
    if st.button(status_label, key="open_llm_config_btn"):
        st.session_state.show_llm_modal = not st.session_state.get("show_llm_modal", False)

    if st.session_state.get("show_llm_modal", False):
        with st.expander("🔑 Dedicated API Key / LLM Provider Configuration", expanded=True):
            st.markdown("Configure your AI Issue Resolution LLM provider and API key. Saved keys persist automatically across user sessions.")
            
            provider = st.selectbox(
                "Select LLM Provider",
                ["OpenAI", "Gemini"],
                index=1 if config.get("llm_provider") == "gemini" else 0
            )
            
            api_key = st.text_input(
                "API Key",
                value=config.get("llm_api_key", ""),
                type="password",
                help="Enter your OpenAI or Google Gemini API key. Stored securely per user account."
            )
            
            c1, c2 = st.columns(2)
            with c1:
                if st.button("💾 Save LLM Settings", type="primary", use_container_width=True):
                    res = BackendAPIService.save_llm_config(user_id, provider.lower(), api_key.strip())
                    if res.get("success"):
                        if "user" in st.session_state and st.session_state.user:
                            st.session_state.user["llm_provider"] = provider.lower()
                            st.session_state.user["llm_api_key"] = api_key.strip()
                        st.success("API Key & Provider updated successfully!")
                        st.session_state.show_llm_modal = False
                        st.rerun()
            with c2:
                if st.button("❌ Close", use_container_width=True):
                    st.session_state.show_llm_modal = False
                    st.rerun()
