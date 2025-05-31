"""
User Profile Page
This page allows users to view and manage their profile and preferences.
"""

import streamlit as st
import pandas as pd
import plotly.express as px
from datetime import datetime, timedelta
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from auth import get_current_user, update_user_preferences, get_user_preferences
from database import get_db_connection

def profile():
    """Display user profile page"""
    print('profile.py loaded')
    # Configure Streamlit page settings
    st.set_page_config(
        page_title='Gods Eye - User Profile',
        page_icon='assets/favicon.png',
        layout='centered',
        initial_sidebar_state='collapsed'
    )
    
    # Check if user is authenticated
    current_user = get_current_user()
    if not current_user:
        st.warning("Please login to view your profile")
        st.button("Go to Login", on_click=lambda: st.switch_page("pages/8_authentication.py"))
        return
    
    # Display profile header
    st.markdown(
        f"<h1 style='text-align: center;'>User Profile: {current_user['username']}</h1>",
        unsafe_allow_html=True
    )
    st.divider()
    
    # Create tabs for different sections
    profile_tab, preferences_tab, history_tab = st.tabs(["Profile", "Preferences", "History"])
    
    # Profile tab
    with profile_tab:
        display_profile(current_user)
    
    # Preferences tab
    with preferences_tab:
        display_preferences(current_user)
    
    # History tab
    with history_tab:
        display_history(current_user)

def display_profile(user_data):
    """Display user profile information
    
    Args:
        user_data: User data dict from session
    """
    st.subheader("Account Information")
    
    # Display account info
    st.markdown(f"**Username:** {user_data['username']}")
    st.markdown(f"**Account Type:** {user_data['account_type'].capitalize()}")
    
    # Account stats
    st.subheader("Account Statistics")
    
    # Get user analytics from database (implement this when we have user history)
    # For now, we'll display placeholder data
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("Articles Analyzed", "28")
    
    with col2:
        st.metric("Misinformation Detected", "5")
    
    with col3:
        st.metric("Days Active", "14")
    
    # Display placeholder visualization
    st.subheader("Your Activity")
    
    # Generate sample data for the past 14 days
    dates = [datetime.now() - timedelta(days=i) for i in range(14)]
    dates.reverse()
    
    data = {
        "date": dates,
        "articles_analyzed": [0, 1, 3, 2, 0, 0, 4, 2, 3, 5, 2, 1, 3, 2]
    }
    
    df = pd.DataFrame(data)
    
    # Create bar chart
    fig = px.bar(
        df,
        x="date",
        y="articles_analyzed",
        labels={"date": "Date", "articles_analyzed": "Articles Analyzed"},
        title="Your Recent Activity"
    )
    
    st.plotly_chart(fig, use_container_width=True)

def display_preferences(user_data):
    """Display and update user preferences
    
    Args:
        user_data: User data dict from session
    """
    st.subheader("Your Preferences")
    
    # Get current preferences from database
    preferences = get_user_preferences(user_data["sub"])
    
    # If no preferences found, use default values
    if not preferences:
        preferences = {
            "topics_of_interest": [],
            "trusted_sources": [],
            "misinformation_alerts": True
        }
    
    # Topics of interest
    st.markdown("### Topics of Interest")
    st.write("Select topics that you are interested in:")
    
    all_topics = ["Politics", "Health", "Technology", "Environment", "Business", "Entertainment", "Sports", "Science"]
    selected_topics = st.multiselect(
        "Topics",
        all_topics,
        default=preferences.get("topics_of_interest", [])
    )
    
    # Trusted sources
    st.markdown("### Trusted News Sources")
    st.write("Add news sources that you trust:")
    
    trusted_sources = st.text_area(
        "Enter news sources (one per line)",
        "\n".join(preferences.get("trusted_sources", [])),
        height=100
    )
    
    # Parse trusted sources from text area
    trusted_sources_list = [source.strip() for source in trusted_sources.split("\n") if source.strip()]
    
    # Notification preferences
    st.markdown("### Notification Preferences")
    
    misinformation_alerts = st.toggle(
        "Receive alerts when misinformation is detected",
        value=preferences.get("misinformation_alerts", True)
    )
    
    # Save preferences button
    if st.button("Save Preferences", type="primary", use_container_width=True):
        # Update preferences
        new_preferences = {
            "topics_of_interest": selected_topics,
            "trusted_sources": trusted_sources_list,
            "misinformation_alerts": misinformation_alerts
        }
        
        result = update_user_preferences(user_data["sub"], new_preferences)
        
        if result["success"]:
            st.success(result["message"])
        else:
            st.error(result["message"])

def display_history(user_data):
    """Display user's history of analyzed articles
    
    Args:
        user_data: User data dict from session
    """
    st.subheader("Your Article Analysis History")
    
    # Placeholder for fetching user's history from database
    # For now, we'll display a message
    st.info("Your analyzed articles will appear here. Start analyzing news articles to build your history!")
    
    # This will be implemented in the future:
    # 1. Query the database for the user's article history
    # 2. Display a list of analyzed articles with summaries
    # 3. Allow the user to filter by date, source, etc.
    # 4. Provide insights based on their history

if __name__ == "__main__":
    profile()
