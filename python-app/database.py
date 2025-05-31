from pymongo import MongoClient
from datetime import datetime, timedelta
import pandas as pd
import json
import os

# MongoDB connection settings
MONGODB_AVAILABLE = True
try:
    # Increase timeout for first connection
    client = MongoClient('mongodb://localhost:27017/', serverSelectionTimeoutMS=5000)
    client.server_info()  # Will throw an exception if the connection fails
    database = client['news_database']
    news_collection = database['news']
    trends_collection = database['trends']
    print("MongoDB connection successful")
except Exception as e:
    MONGODB_AVAILABLE = False
    print(f"MongoDB connection failed: {e}")
    print("Using local file storage for data as fallback")

# Local file storage (fallback when MongoDB is not available)
NEWS_FILE = "news_data.json"
TRENDS_FILE = "trends_data.json"

def get_news_from_file():
    """Get news data from local file"""
    try:
        with open(NEWS_FILE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

def save_news_to_file(news_data):
    """Save news data to local file"""
    with open(NEWS_FILE, 'w') as f:
        json.dump(news_data, f, default=str)  # Convert datetime objects to strings

def get_trends_from_file():
    """Get trends data from local file"""
    try:
        with open(TRENDS_FILE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def save_trends_to_file(trends_data):
    """Save trends data to local file"""
    with open(TRENDS_FILE, 'w') as f:
        json.dump(trends_data, f, default=str)  # Convert datetime objects to strings

def database_history(document_name, data):
    """Store news data in database or file"""
    try:
        if MONGODB_AVAILABLE:
            # MongoDB implementation
            news_document = news_collection.find_one({'_id': document_name})
            if news_document and news_document.get('news_data') == data:
                print(f'[Database] News data for "{document_name}" already exists.')
                return

            news_collection.update_one(
                {'_id': document_name},
                {'$set': {'news_data': data}},
                upsert=True
            )

            print(f'[Database] News data for "{document_name}" stored.')
        else:
            # File-based implementation
            news_data = get_news_from_file()
            
            if document_name in news_data and news_data[document_name] == data:
                print(f'[Database] News data for "{document_name}" already exists.')
                return
            
            news_data[document_name] = data
            save_news_to_file(news_data)
            print(f'[Database] News data for "{document_name}" stored.')
            
        # Store trend data for historical analysis
        store_trend_data(data)
    except Exception as exc:
        print(f'Storage error:\n {exc}')

def store_trend_data(data):
    """
    Store trend data in the trends collection
    
    Args:
        data: News analysis data
    """
    try:
        # Extract relevant data for trends
        trend_data = {
            'timestamp': datetime.now(),
            'source': data.get('publisher', 'Unknown'),
            'topic': data.get('category', 'Uncategorized'),
            'positive_percentage': float(data.get('positive_percentage', '0').replace('%', '')),
            'neutral_percentage': float(data.get('neutral_percentage', '0').replace('%', '')),
            'negative_percentage': float(data.get('negative_percentage', '0').replace('%', '')),
            'misinformation_flag': False,
            'misinformation_count': 0
        }
        
        # Check if article has misinformation based on authenticity data
        authenticity = data.get('authenticity', {})
        if isinstance(authenticity, dict):
            misinformation_status = authenticity.get('Misinformation Status', {})
            if isinstance(misinformation_status, dict) and misinformation_status.get('Misinformation') == 'Yes':
                trend_data['misinformation_flag'] = True
                trend_data['misinformation_count'] = 1
                
            # Check fact check results
            fact_check = authenticity.get('Fact Check', {})
            if isinstance(fact_check, dict) and fact_check.get('article_status') == 'False':
                trend_data['misinformation_flag'] = True
                trend_data['misinformation_count'] = len(fact_check.get('verified_claims', []))
        
        # Store trend data
        if MONGODB_AVAILABLE:
            # MongoDB implementation
            trends_collection.insert_one(trend_data)
        else:
            # File-based implementation
            trends_data = get_trends_from_file()
            trends_data.append(trend_data)
            save_trends_to_file(trends_data)
    except Exception as exc:
        print(f'Error storing trend data: {exc}')

def get_db_connection():
    """
    Get MongoDB database connection
    
    Returns:
        MongoDB database connection or None if not available
    """
    if MONGODB_AVAILABLE:
        return database
    else:
        return None

def get_trend_data(time_period, topics=None):
    """
    Get trend data from database
    
    Args:
        time_period: Time period to retrieve data for (e.g., 'Last 24 Hours')
        topics: List of topics to filter by
        
    Returns:
        DataFrame with trend data
    """
    try:
        # Convert time period to date range
        now = datetime.now()
        if time_period == 'Last 24 Hours':
            start_time = now - timedelta(days=1)
        elif time_period == 'Last Week':
            start_time = now - timedelta(weeks=1)
        elif time_period == 'Last Month':
            start_time = now - timedelta(days=30)
        elif time_period == 'Last Year':
            start_time = now - timedelta(days=365)
        else:
            start_time = now - timedelta(days=30)  # Default to last month
        
        if MONGODB_AVAILABLE:
            # MongoDB implementation
            # Build query
            query = {'timestamp': {'$gte': start_time}}
            if topics and 'All Topics' not in topics:
                query['topic'] = {'$in': topics}
            
            # Execute query
            results = list(trends_collection.find(query))
        else:
            # File-based implementation
            trends_data = get_trends_from_file()
            
            # Filter by date
            results = []
            for item in trends_data:
                # Convert string timestamp to datetime if needed
                if isinstance(item['timestamp'], str):
                    item_timestamp = datetime.fromisoformat(item['timestamp'].replace('Z', '+00:00'))
                else:
                    item_timestamp = item['timestamp']
                
                if item_timestamp >= start_time:
                    # Filter by topic if specified
                    if topics and 'All Topics' not in topics:
                        if item.get('topic') in topics:
                            results.append(item)
                    else:
                        results.append(item)
        
        if not results:
            print(f"No trend data found for {time_period}, generating sample data...")
            return generate_sample_trend_data(time_period, topics)
        
        # Convert to DataFrame
        df = pd.DataFrame(results)
        df.rename(columns={'timestamp': 'date'}, inplace=True)
        
        return df
    except Exception as exc:
        print(f'Error retrieving trend data: {exc}')
        return pd.DataFrame()

def generate_sample_trend_data(time_period, topics=None):
    """
    Generate sample trend data for demonstration
    
    Args:
        time_period: Time period to generate data for (e.g., 'Last 24 Hours')
        topics: List of topics to include
        
    Returns:
        DataFrame with sample trend data
    """
    import random
    
    # Determine date range based on time period
    now = datetime.now()
    if time_period == 'Last 24 Hours':
        start_time = now - timedelta(days=1)
        num_points = 24  # Hourly data
    elif time_period == 'Last Week':
        start_time = now - timedelta(weeks=1)
        num_points = 7  # Daily data
    elif time_period == 'Last Month':
        start_time = now - timedelta(days=30)
        num_points = 30  # Daily data
    elif time_period == 'Last Year':
        start_time = now - timedelta(days=365)
        num_points = 12  # Monthly data
    else:
        start_time = now - timedelta(days=30)  # Default to last month
        num_points = 30  # Daily data
    
    # Determine which topics to generate data for
    if not topics or 'All Topics' in topics:
        available_topics = ['Politics', 'Health', 'Technology', 'Business', 'Entertainment']
    else:
        available_topics = topics
    
    # Generate sample data
    data = []
    
    # List of sample news sources
    sources = ['CNN', 'BBC', 'Fox News', 'Reuters', 'NDTV', 'The Guardian', 'Al Jazeera']
    
    # Generate data points
    time_increment = (now - start_time) / num_points
    
    for i in range(num_points):
        # Generate several entries for each time point
        num_entries = random.randint(3, 8)  # Random number of articles per time point
        point_time = start_time + (time_increment * i)
        
        for _ in range(num_entries):
            topic = random.choice(available_topics)
            source = random.choice(sources)
            
            # Random sentiment percentages (sum to 100)
            pos = random.randint(20, 70)
            neg = random.randint(10, 100 - pos)
            neutral = 100 - pos - neg
            
            # Random misinformation flag (10% chance of being true)
            misinformation_flag = random.random() < 0.1
            misinformation_count = random.randint(1, 3) if misinformation_flag else 0
            
            data.append({
                'date': point_time + timedelta(minutes=random.randint(0, 59)),
                'source': source,
                'topic': topic,
                'positive_percentage': pos,
                'neutral_percentage': neutral,
                'negative_percentage': neg,
                'misinformation_flag': misinformation_flag,
                'misinformation_count': misinformation_count
            })
    
    # Convert to DataFrame
    df = pd.DataFrame(data)
    return df
