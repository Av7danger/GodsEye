"""
Historical News Trend Analysis Page
This page displays historical trends in news sentiment, topics, and misinformation.
"""

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from datetime import datetime, timedelta
import random
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database import get_db_connection, get_trend_data

def trends() -> None:
    """Display historical news trends analysis"""
    print('trends.py loaded')
    # Configure Streamlit page settings
    st.set_page_config(
        page_title='Gods Eye - News Trends',
        page_icon='assets/favicon.png',
        layout='wide',
        initial_sidebar_state='collapsed'
    )
    st.markdown(
        "<h1 style='text-align: center;'>News Trends Analysis</h1>",
        unsafe_allow_html=True
    )
    st.divider()
    
    # Time period selection
    time_period = st.selectbox(
        "Select Time Period", 
        ["Last 24 Hours", "Last Week", "Last Month", "Last Year"]
    )
    
    # Topic selection
    topics = ["All Topics", "Politics", "Health", "Technology", "Environment", "Business"]
    selected_topics = st.multiselect("Select Topics", topics, default=["All Topics"])
    
    # Get data from database
    db = get_db_connection()
    df = get_trend_data(time_period, selected_topics)
    
    # If no data is found in the database, generate sample data
    if df.empty:
        st.warning("No historical data found. Showing sample data for demonstration.")
        df = generate_sample_trend_data(time_period, selected_topics)
    
    # Create visualizations
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Sentiment Trends Over Time")
        fig = px.line(
            df, 
            x="date", 
            y=["positive_percentage", "neutral_percentage", "negative_percentage"],
            labels={"value": "Percentage", "variable": "Sentiment Type"},
            color_discrete_map={
                "positive_percentage": "#3CB371", 
                "neutral_percentage": "#808080", 
                "negative_percentage": "#FF6347"
            }
        )
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        st.subheader("Top Topics Mentioned")
        topic_counts = df["topic"].value_counts().reset_index()
        topic_counts.columns = ["Topic", "Count"]
        fig = px.pie(topic_counts, values="Count", names="Topic")
        st.plotly_chart(fig, use_container_width=True)
    
    # Misinformation tracker
    st.subheader("Misinformation Tracker")
    misinfo_data = df[df["misinformation_flag"] == True]
    
    if not misinfo_data.empty:
        fig = px.bar(
            misinfo_data.groupby("source")["misinformation_count"].sum().reset_index(),
            x="source",
            y="misinformation_count",
            title="Sources with Highest Misinformation Counts",
            labels={"source": "News Source", "misinformation_count": "Misinformation Count"}
        )
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("No misinformation detected in the selected time period and topics.")
    
    # Source reliability over time
    st.subheader("Source Reliability Over Time")
    sources = df["source"].unique()
    
    # Create reliability score for each source over time
    reliability_data = []
    for source in sources:
        source_data = df[df["source"] == source]
        dates = sorted(source_data["date"].unique())
        
        for date in dates:
            date_data = source_data[source_data["date"] == date]
            # Calculate a reliability score (inverse of misinformation count)
            misinfo_count = date_data["misinformation_count"].sum()
            total_articles = len(date_data)
            reliability_score = 100 - (misinfo_count / max(1, total_articles) * 100)
            
            reliability_data.append({
                "source": source,
                "date": date,
                "reliability_score": reliability_score
            })
    
    if reliability_data:
        reliability_df = pd.DataFrame(reliability_data)
        fig = px.line(
            reliability_df, 
            x="date", 
            y="reliability_score", 
            color="source",
            title="Source Reliability Scores Over Time",
            labels={"reliability_score": "Reliability Score (%)", "date": "Date"}
        )
        st.plotly_chart(fig, use_container_width=True)
        
    # Additional insights section
    st.subheader("News Trend Insights")
    
    # Calculate some metrics
    total_articles = len(df)
    misinfo_percentage = (len(misinfo_data) / total_articles * 100) if total_articles > 0 else 0
    most_reliable_source = None
    most_unreliable_source = None
    
    if reliability_data:
        source_reliability = {}
        for item in reliability_data:
            source = item["source"]
            score = item["reliability_score"]
            if source not in source_reliability:
                source_reliability[source] = []
            source_reliability[source].append(score)
        
        source_avg_reliability = {source: sum(scores)/len(scores) for source, scores in source_reliability.items()}
        most_reliable_source = max(source_avg_reliability.items(), key=lambda x: x[1])
        most_unreliable_source = min(source_avg_reliability.items(), key=lambda x: x[1])
    
    # Display metrics
    metrics_col1, metrics_col2, metrics_col3 = st.columns(3)
    
    with metrics_col1:
        st.metric("Total Articles Analyzed", total_articles)
    
    with metrics_col2:
        st.metric("Misinformation Percentage", f"{misinfo_percentage:.1f}%")
    
    with metrics_col3:
        if most_reliable_source:
            st.metric("Most Reliable Source", most_reliable_source[0], f"{most_reliable_source[1]:.1f}% reliable")
    
    # Provide text insights
    st.markdown("### Key Observations")
    
    if total_articles > 0:
        insights = []
        
        # Sentiment trends
        avg_positive = df["positive_percentage"].mean()
        avg_negative = df["negative_percentage"].mean()
        avg_neutral = df["neutral_percentage"].mean()
        
        if avg_positive > avg_negative and avg_positive > avg_neutral:
            insights.append(f"The overall sentiment during this period is positive ({avg_positive:.1f}%), indicating generally optimistic news coverage.")
        elif avg_negative > avg_positive and avg_negative > avg_neutral:
            insights.append(f"The overall sentiment during this period is negative ({avg_negative:.1f}%), suggesting prevalent concerning news topics.")
        else:
            insights.append(f"The overall sentiment during this period is mainly neutral ({avg_neutral:.1f}%), indicating balanced or factual reporting.")
        
        # Misinformation insights
        if misinfo_percentage > 20:
            insights.append(f"Warning: High levels of misinformation detected ({misinfo_percentage:.1f}% of articles). Be extra cautious with news verification.")
        elif misinfo_percentage > 10:
            insights.append(f"Moderate levels of misinformation detected ({misinfo_percentage:.1f}% of articles). Stay vigilant when consuming news.")
        else:
            insights.append(f"Low levels of misinformation detected ({misinfo_percentage:.1f}% of articles), suggesting generally reliable reporting.")
        
        # Source reliability insights
        if most_reliable_source and most_unreliable_source:
            insights.append(f"{most_reliable_source[0]} has been the most reliable source ({most_reliable_source[1]:.1f}% reliability), while {most_unreliable_source[0]} has been the least reliable ({most_unreliable_source[1]:.1f}% reliability).")
        
        # Display all insights
        for insight in insights:
            st.markdown(f"- {insight}")
    else:
        st.warning("Not enough data to generate meaningful insights. Please adjust your filters or check back when more articles have been analyzed.")

def generate_sample_trend_data(time_period, selected_topics):
    """
    Generate sample trend data for demonstration
    
    Args:
        time_period: Selected time period
        selected_topics: List of selected topics
        
    Returns:
        DataFrame with sample trend data
    """
    # Define the date range based on time period
    date_range = {
        "Last 24 Hours": 1,
        "Last Week": 7,
        "Last Month": 30,
        "Last Year": 365
    }
    
    days = date_range[time_period]
    dates = [datetime.now() - timedelta(days=i) for i in range(days)]
    dates.sort()  # Sort dates in ascending order
    
    # Generate random data for demonstration
    data = {
        "date": dates,
        "topic": [random.choice(["Politics", "Health", "Technology", "Environment", "Business"]) for _ in range(len(dates))],
        "positive_percentage": [random.randint(20, 50) for _ in range(len(dates))],
        "neutral_percentage": [random.randint(20, 40) for _ in range(len(dates))],
        "negative_percentage": [random.randint(10, 40) for _ in range(len(dates))],
        "misinformation_flag": [random.choice([True, False, False, False]) for _ in range(len(dates))],  # Less likely to be misinformation
        "misinformation_count": [random.randint(0, 5) for _ in range(len(dates))],
        "source": [random.choice(["NDTV", "BBC", "CNN", "Fox News", "Al Jazeera"]) for _ in range(len(dates))]
    }
    
    df = pd.DataFrame(data)
    
    # Make sure percentages add up to 100
    for i in range(len(df)):
        total = df.loc[i, "positive_percentage"] + df.loc[i, "neutral_percentage"] + df.loc[i, "negative_percentage"]
        df.loc[i, "positive_percentage"] = round(df.loc[i, "positive_percentage"] / total * 100)
        df.loc[i, "neutral_percentage"] = round(df.loc[i, "neutral_percentage"] / total * 100)
        df.loc[i, "negative_percentage"] = 100 - df.loc[i, "positive_percentage"] - df.loc[i, "neutral_percentage"]
    
    # Filter by topic if not "All Topics"
    if "All Topics" not in selected_topics:
        df = df[df["topic"].isin(selected_topics)]
        
    return df

if __name__ == "__main__":
    trends()
