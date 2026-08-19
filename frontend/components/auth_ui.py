"""
frontend/components/auth_ui.py
------------------------------
Authentication UI components for registration, login, logout, and protected route checks.
"""

import streamlit as st
from frontend.services.api_service import BackendAPIService

def clear_user_session():
    st.session_state.user = None
    for key in ["analysis_results", "active_action", "selected_file", "resolved_solutions"]:
        if key in st.session_state:
            del st.session_state[key]

def render_auth_section():
    if "user" not in st.session_state:
        st.session_state.user = None

    if st.session_state.user is not None:
        c1, c2 = st.columns([4, 1])
        with c1:
            st.success(f"👤 Logged in as **{st.session_state.user['username']}**")
        with c2:
            if st.button("🚪 Logout", key="logout_btn", use_container_width=True):
                clear_user_session()
                st.rerun()
        return True

    st.markdown("## 🔐 Authentication Required")
    auth_tab1, auth_tab2 = st.tabs(["🔑 Sign In", "📝 Create Account"])

    with auth_tab1:
        with st.form("login_form"):
            username = st.text_input("Username")
            password = st.text_input("Password", type="password")
            submit = st.form_submit_button("Sign In", type="primary")
            
            if submit:
                if not username or not password:
                    st.error("Please fill in both fields.")
                else:
                    res = BackendAPIService.login(username, password)
                    if res.get("success"):
                        clear_user_session()
                        user_id = res["user_id"]
                        st.session_state.user = {
                            "user_id": user_id,
                            "username": res["username"],
                            "llm_provider": res.get("llm_provider", "openai"),
                            "llm_api_key": res.get("llm_api_key", ""),
                            "token": res.get("token", "")
                        }
                        
                        # Auto-load latest user analysis upon login
                        latest_res = BackendAPIService.get_latest_analysis(user_id)
                        if latest_res.get("success"):
                            st.session_state.analysis_results = latest_res["data"]
                        
                        st.success("Signed in successfully!")
                        st.rerun()
                    else:
                        st.error(res.get("message", "Login failed."))

    with auth_tab2:
        with st.form("register_form"):
            new_user = st.text_input("New Username")
            new_email = st.text_input("Email Address")
            new_pass = st.text_input("New Password", type="password")
            submit_reg = st.form_submit_button("Register Account")

            if submit_reg:
                if not new_user or not new_email or not new_pass:
                    st.error("All fields are required.")
                else:
                    res = BackendAPIService.register(new_user, new_email, new_pass)
                    if res.get("success"):
                        st.success("Account created! Please sign in.")
                    else:
                        st.error(res.get("message", "Registration failed."))

    return False
