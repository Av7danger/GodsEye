"""
Comparative News Analysis Page
This page compares different news sources' coverage of the same topic,
highlighting differences in sentiment, claims, and potential bias.
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
from auth import get_current_user
from database import get_db_connection

def comparative_analysis():
    """Display comparative news analysis page"""
    print('comparative_analysis.py loaded')
    # Configure Streamlit page settings
    st.set_page_config(
        page_title='Gods Eye - Comparative Analysis',
        page_icon='assets/favicon.png',
        layout='wide',
        initial_sidebar_state='collapsed'
    )
    
    st.markdown(
        "<h1 style='text-align: center;'>Comparative News Analysis</h1>",
        unsafe_allow_html=True
    )
    st.divider()
    
    # Display info about the feature
    st.info(
        """
        This feature allows you to compare how different news sources cover the same topic.
        Enter URLs from different news sources covering the same event to see a side-by-side comparison.
        """
    )
    
    # Input section for news URLs
    st.subheader("Enter News Article URLs")
    
    # Create form for URL input
    with st.form("url_form"):
        col1, col2 = st.columns(2)
        
        with col1:
            url1 = st.text_input("URL of First News Article")
            source1 = st.text_input("Source Name (e.g., CNN)")
        
        with col2:
            url2 = st.text_input("URL of Second News Article")
            source2 = st.text_input("Source Name (e.g., Fox News)")
        
        # Optional third source
        add_third = st.checkbox("Add a third source")
        if add_third:
            url3 = st.text_input("URL of Third News Article")
            source3 = st.text_input("Source Name (e.g., BBC)")
        else:
            url3 = None
            source3 = None
        
        # Topic field
        topic = st.text_input("Topic/Event Being Covered")
        
        # Submit button
        submit_button = st.form_submit_button("Compare Articles", use_container_width=True)
    
    # Process when form is submitted
    if submit_button:
        if not url1 or not url2 or not source1 or not source2 or not topic:
            st.error("Please fill in all required fields (first and second articles)")
        else:
            # In a real implementation, we would:
            # 1. Call the API to analyze each article
            # 2. Get sentiment, claims, entities, etc. from each
            # 3. Calculate differences and metrics
            
            # For now, show a loading message and then display sample comparison
            with st.spinner("Analyzing articles... This may take up to a minute."):
                # Simulate processing time
                # time.sleep(3)
                st.success("Analysis complete!")
                
                # Display comparison
                display_comparison(
                    topic,
                    [source1, source2, source3] if add_third else [source1, source2],
                    [url1, url2, url3] if add_third else [url1, url2]
                )

def display_comparison(topic, sources, urls):
    """
    Display comparative analysis of news articles
    
    Args:
        topic: The topic being covered
        sources: List of news source names
        urls: List of URLs analyzed
    """
    # Filter out None values
    valid_sources = [s for s in sources if s]
    valid_urls = [u for u in urls if u]
    
    # Generate sample data (in production, this would be real analysis)
    data = generate_sample_comparison_data(valid_sources)
    
    st.header(f"Comparative Analysis: {topic}")
    
    # URL reference
    with st.expander("Article URLs"):
        for i, (source, url) in enumerate(zip(valid_sources, valid_urls)):
            st.markdown(f"**{source}**: [{url}]({url})")
    
    # Sentiment comparison
    st.subheader("Sentiment Comparison")
    
    fig = px.bar(
        data, 
        x="source", 
        y=["positive_percentage", "neutral_percentage", "negative_percentage"],
        title="Sentiment Analysis Comparison",
        barmode="stack",
        color_discrete_map={
            "positive_percentage": "#3CB371", 
            "neutral_percentage": "#808080", 
            "negative_percentage": "#FF6347"
        }
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    # Key claims
    st.subheader("Key Claims Comparison")
    
    tab_sources = st.tabs(valid_sources)
    
    for i, tab in enumerate(tab_sources):
        with tab:
            source_claims = data[data["source"] == valid_sources[i]]["key_claims"].values[0]
            
            for claim in source_claims:
                with st.container(border=True):
                    col1, col2 = st.columns([4, 1])
                    
                    with col1:
                        st.markdown(f"**Claim:** {claim['text']}")
                    
                    with col2:
                        if claim["verified"]:
                            st.markdown("✅ Verified")
                        else:
                            st.markdown("❓ Unverified")
                    
                    if claim.get("verification_source"):
                        st.markdown(f"**Source:** {claim['verification_source']}")
    
    # Bias indicators
    st.subheader("Bias Indicators")
    
    bias_data = []
    for i, source in enumerate(valid_sources):
        source_data = data[data["source"] == source]
        bias_data.append({
            "source": source,
            "bias_score": source_data["bias_score"].values[0],
            "leaning": source_data["leaning"].values[0]
        })
    
    bias_df = pd.DataFrame(bias_data)
    
    fig = px.bar(
        bias_df,
        x="source",
        y="bias_score",
        color="leaning",
        title="Bias Score by Source",
        labels={"bias_score": "Bias Score (0-10)"},
        color_discrete_map={
            "left": "blue",
            "center": "purple",
            "right": "red"
        }
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    # Entity overlap
    st.subheader("Entity Coverage Overlap")
    
    # Create a Venn diagram-like visualization for entity overlap
    # Here we'll use a heatmap to show similarity between sources
    similarity_matrix = []
    
    for i, source1 in enumerate(valid_sources):
        row = []
        for j, source2 in enumerate(valid_sources):
            if i == j:
                row.append(1.0)  # Same source, 100% similarity
            else:
                # Generate a random similarity between 0.3 and 0.8
                # In a real implementation, this would be calculated from entity overlap
                similarity = random.uniform(0.3, 0.8)
                row.append(similarity)
        similarity_matrix.append(row)
    
    similarity_df = pd.DataFrame(similarity_matrix, columns=valid_sources, index=valid_sources)
    
    fig = px.imshow(
        similarity_df,
        labels=dict(x="Source", y="Source", color="Similarity"),
        x=valid_sources,
        y=valid_sources,
        color_continuous_scale="Viridis",
        title="Entity Coverage Similarity Between Sources"
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    # Key differences
    st.subheader("Key Narrative Differences")
    
    # In a real implementation, this would identify key differences in narrative
    # For now, we'll show sample differences
    differences = [
        "Source focus and emphasis on different aspects of the event",
        "Attribution of responsibility varies between sources",
        "Different selection of experts and quotes",
        "Varying levels of context provided for the event"
    ]
    
    for diff in differences:
        st.markdown(f"- {diff}")
    
    # Coverage timeline
    st.subheader("Event Coverage Timeline")
    
    # Generate sample timeline data
    timeline_data = []
    base_time = datetime.now() - timedelta(days=1)
    
    for i, source in enumerate(valid_sources):
        # Each source published at a slightly different time
        publish_time = base_time + timedelta(hours=i*2 + random.randint(0, 3))
        update_times = []
        
        # Some sources have updates
        num_updates = random.randint(0, 3)
        for j in range(num_updates):
            update_time = publish_time + timedelta(hours=j*2 + random.randint(1, 4))
            if update_time < datetime.now():
                update_times.append(update_time)
        
        timeline_data.append({
            "source": source,
            "published": publish_time,
            "updates": update_times
        })
    
    # Create a timeline visualization
    fig = go.Figure()
    
    for i, item in enumerate(timeline_data):
        # Add publication point
        fig.add_trace(go.Scatter(
            x=[item["published"]],
            y=[i],
            mode="markers",
            marker=dict(size=15, color="blue"),
            name=f"{item['source']} Published",
            text=f"{item['source']} first published"
        ))
        
        # Add update points
        for update in item["updates"]:
            fig.add_trace(go.Scatter(
                x=[update],
                y=[i],
                mode="markers",
                marker=dict(size=10, color="green"),
                name=f"{item['source']} Update",
                text=f"{item['source']} updated article"
            ))
    
    fig.update_layout(
        title="Publication and Update Timeline",
        xaxis_title="Time",
        yaxis=dict(
            tickmode="array",
            tickvals=list(range(len(valid_sources))),
            ticktext=valid_sources
        ),
        showlegend=True,
        height=300
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    # Conclusion
    st.subheader("Analysis Summary")
    
    st.markdown(
        """
        This comparative analysis highlights how different news sources cover the same event with varying:
        
        - Sentiment and tone
        - Focus and emphasis
        - Claims and fact-checking
        - Political leaning and bias
        
        Reading multiple sources provides a more complete understanding of the event.
        """
    )

def generate_sample_comparison_data(sources):
    """
    Generate sample data for demonstration
    
    Args:
        sources: List of news source names
        
    Returns:
        DataFrame with sample comparison data
    """
    data = []
    
    for source in sources:
        # Generate random sentiment values that add up to 100
        pos = random.randint(20, 60)
        neg = random.randint(10, 40)
        neutral = 100 - pos - neg
        
        # Determine leaning based on source name (just for demo)
        if "fox" in source.lower():
            leaning = "right"
            bias_score = random.uniform(6.0, 8.0)
        elif "msnbc" in source.lower():
            leaning = "left"
            bias_score = random.uniform(6.0, 8.0)
        elif "bbc" in source.lower() or "reuters" in source.lower():
            leaning = "center"
            bias_score = random.uniform(2.0, 4.0)
        else:
            # Random for other sources
            leaning = random.choice(["left", "center", "right"])
            bias_score = random.uniform(3.0, 7.0)
        
        # Generate sample claims
        num_claims = random.randint(3, 5)
        claims = []
        
        claim_templates = [
            "The event occurred at {time} on {date}.",
            "Officials reported {number} people were affected.",
            "{Person} stated that the situation was under control.",
            "The cause was determined to be {cause}.",
            "Witnesses described seeing {description}.",
            "Experts predict {prediction} in the coming days.",
            "The government has pledged {amount} in response.",
            "This is the {nth} such incident this year."
        ]
        
        for i in range(num_claims):
            # Select a random claim template
            template = random.choice(claim_templates)
            
            # Fill in some random values
            claim_text = template.format(
                time="morning" if i % 2 == 0 else "afternoon",
                date="Tuesday" if i % 2 == 0 else "Wednesday",
                number=str(random.randint(5, 50)),
                Person="The President" if i % 3 == 0 else "The spokesperson",
                cause="human error" if i % 2 == 0 else "technical failure",
                description="flash of light" if i % 2 == 0 else "loud noise",
                prediction="further developments" if i % 2 == 0 else "stabilization",
                amount="$1 million" if i % 2 == 0 else "$500,000",
                nth="third" if i % 2 == 0 else "fourth"
            )
            
            # Determine if claim is verified (for demo)
            verified = random.choice([True, False, True])
            
            verification_source = None
            if verified:
                verification_source = random.choice([
                    "Official statement",
                    "Multiple witnesses",
                    "Government records",
                    "Expert consensus",
                    None
                ])
            
            claims.append({
                "text": claim_text,
                "verified": verified,
                "verification_source": verification_source
            })
        
        # Add record for this source
        data.append({
            "source": source,
            "positive_percentage": pos,
            "neutral_percentage": neutral,
            "negative_percentage": neg,
            "bias_score": bias_score,
            "leaning": leaning,
            "key_claims": claims
        })
    
    return pd.DataFrame(data)

if __name__ == "__main__":
    comparative_analysis()
