"""
User Authentication Page
This page allows users to login, register, and manage their account.
"""

import streamlit as st
import re
from datetime import datetime
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from auth import register_user, login_user, get_current_user, logout_user

def auth_page():
    """Display authentication page"""
    print('authentication.py loaded')
    # Configure Streamlit page settings
    st.set_page_config(
        page_title='Gods Eye - Authentication',
        page_icon='assets/favicon.png',
        layout='centered',
        initial_sidebar_state='collapsed'
    )
    
    # Title and description
    st.image("assets/logo.png", width=200)
    st.markdown(
        "<h1 style='text-align: center;'>Authentication</h1>",
        unsafe_allow_html=True
    )
    st.divider()
    
    # Check if user is already logged in
    current_user = get_current_user()
    if current_user:
        display_logged_in_view(current_user)
    else:
        display_login_register_view()

def display_logged_in_view(user_data):
    """Display the view for logged-in users
    
    Args:
        user_data: User data dict from session
    """
    st.success(f"Welcome back, {user_data['username']}!")
    
    # User profile section
    st.subheader("Your Profile")
    st.markdown(f"**Account Type:** {user_data['account_type'].capitalize()}")
    
    # Update preferences section if we implement it later
    
    # Logout button
    if st.button("Logout", type="primary", use_container_width=True):
        logout_user()
        st.rerun()  # Refresh the page to show login view

def display_login_register_view():
    """Display login and registration forms for unauthenticated users"""
    # Create tabs for login and registration
    login_tab, register_tab = st.tabs(["Login", "Register"])
    
    # Login tab
    with login_tab:
        with st.form("login_form"):
            st.subheader("Login to Your Account")
            
            identifier = st.text_input("Username or Email")
            password = st.text_input("Password", type="password")
            
            login_submit = st.form_submit_button("Login", use_container_width=True)
            
            if login_submit:
                if not identifier or not password:
                    st.error("Please fill in all fields")
                else:
                    result = login_user(identifier, password)
                    
                    if result["success"]:
                        # Store token in session state
                        st.session_state.token = result["token"]
                        st.session_state.user = {
                            "username": result["username"],
                            "account_type": result["account_type"]
                        }
                        st.success(result["message"])
                        st.rerun()  # Refresh to show logged-in view
                    else:
                        st.error(result["message"])
    
    # Register tab
    with register_tab:
        with st.form("register_form"):
            st.subheader("Create a New Account")
            
            username = st.text_input("Username (min 4 characters)")
            email = st.text_input("Email Address")
            password = st.text_input("Password (min 8 characters)", type="password")
            confirm_password = st.text_input("Confirm Password", type="password")
            
            register_submit = st.form_submit_button("Register", use_container_width=True)
            
            if register_submit:
                # Validate inputs
                if not username or not email or not password or not confirm_password:
                    st.error("Please fill in all fields")
                elif len(username) < 4:
                    st.error("Username must be at least 4 characters")
                elif not re.match(r"[^@]+@[^@]+\.[^@]+", email):
                    st.error("Please enter a valid email address")
                elif len(password) < 8:
                    st.error("Password must be at least 8 characters")
                elif password != confirm_password:
                    st.error("Passwords do not match")
                else:
                    # All validation passed, attempt registration
                    result = register_user(username, email, password)
                    
                    if result["success"]:
                        st.success(result["message"])
                        st.info("Please go to the Login tab to sign in")
                    else:
                        st.error(result["message"])
    
    # Display info section
    st.markdown("---")
    st.markdown(
        """
        ### Benefits of creating an account:
        - Save your news analysis history
        - Personalize your news verification settings
        - Get alerts for misinformation from sources you follow
        - Track news trends that matter to you
        """
    )

if __name__ == "__main__":
    auth_page()
