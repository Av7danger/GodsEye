"""
Authentication module for the GodsEye application.
Handles user registration, login, authentication, and session management.
"""

import bcrypt
from datetime import datetime, timedelta
import jwt
import streamlit as st
from pymongo import MongoClient
import os
import uuid
import json
import sys

# MongoDB connection settings
MONGODB_AVAILABLE = True
try:
    # Increase timeout for first connection
    client = MongoClient('mongodb://localhost:27017/', serverSelectionTimeoutMS=5000)
    client.server_info()  # Will throw an exception if the connection fails
    database = client['news_database']
    users_collection = database['users']
    print("MongoDB connection successful")
except Exception as e:
    MONGODB_AVAILABLE = False
    print(f"MongoDB connection failed: {e}")
    print("Using local file storage for user data as fallback")

# JWT settings
SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "godseye_default_secret_key_0123456789")
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Local file storage (fallback when MongoDB is not available)
USERS_FILE = "users.json"

def get_users_from_file():
    """Get users from local file"""
    try:
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

def save_users_to_file(users):
    """Save users to local file"""
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, default=str)  # Convert datetime objects to strings

def create_access_token(data: dict, expires_delta: timedelta = None):
    """
    Create a JWT access token for authentication
    
    Args:
        data: Data to encode in the token
        expires_delta: Time until token expiration
        
    Returns:
        JWT token string
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm="HS256")
    return encoded_jwt

def verify_token(token: str):
    """
    Verify JWT token and return user data
    
    Args:
        token: JWT token string
        
    Returns:
        User data dict if token is valid, None otherwise
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.PyJWTError:
        return None

def hash_password(password: str):
    """
    Hash password using bcrypt
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password
    """
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(plain_password: str, hashed_password: str):
    """
    Verify password against hash
    
    Args:
        plain_password: Plain text password
        hashed_password: Hashed password
        
    Returns:
        True if password matches hash, False otherwise
    """
    return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())

def register_user(username: str, email: str, password: str):
    """
    Register a new user
    
    Args:
        username: Username
        email: Email address
        password: Plain text password
        
    Returns:
        Success message if registration successful, error message otherwise
    """
    if MONGODB_AVAILABLE:
        # MongoDB implementation
        # Check if username or email already exists
        if users_collection.find_one({"username": username}):
            return {"success": False, "message": "Username already exists"}
        
        if users_collection.find_one({"email": email}):
            return {"success": False, "message": "Email already exists"}
        
        # Create new user
        user_id = str(uuid.uuid4())
        new_user = {
            "user_id": user_id,
            "username": username,
            "email": email,
            "password": hash_password(password),
            "created_at": datetime.utcnow(),
            "last_login": None,
            "account_type": "user",  # Default account type
            "preferences": {
                "topics_of_interest": [],
                "trusted_sources": [],
                "misinformation_alerts": True
            }
        }
        
        users_collection.insert_one(new_user)
        return {"success": True, "message": "Registration successful", "user_id": user_id}
    else:
        # File-based implementation
        users = get_users_from_file()
        
        # Check if username or email already exists
        for user_id, user in users.items():
            if user["username"] == username:
                return {"success": False, "message": "Username already exists"}
            if user["email"] == email:
                return {"success": False, "message": "Email already exists"}
        
        # Create new user
        user_id = str(uuid.uuid4())
        new_user = {
            "user_id": user_id,
            "username": username,
            "email": email,
            "password": hash_password(password),
            "created_at": datetime.utcnow(),
            "last_login": None,
            "account_type": "user",  # Default account type
            "preferences": {
                "topics_of_interest": [],
                "trusted_sources": [],
                "misinformation_alerts": True
            }
        }
        
        users[user_id] = new_user
        save_users_to_file(users)
        return {"success": True, "message": "Registration successful", "user_id": user_id}

def login_user(identifier: str, password: str):
    """
    Login a user with username/email and password
    
    Args:
        identifier: Username or email
        password: Plain text password
        
    Returns:
        User data and token if login successful, error message otherwise
    """
    if MONGODB_AVAILABLE:
        # MongoDB implementation
        # Find user by username or email
        user = users_collection.find_one({"$or": [{"username": identifier}, {"email": identifier}]})
        
        if not user:
            return {"success": False, "message": "User not found"}
        
        # Verify password
        if not verify_password(password, user["password"]):
            return {"success": False, "message": "Incorrect password"}
        
        # Update last login
        users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login": datetime.utcnow()}}
        )
        
        # Generate token
        token_data = {
            "sub": str(user["user_id"]),
            "username": user["username"],
            "account_type": user["account_type"]
        }
        
        access_token = create_access_token(token_data)
        
        return {
            "success": True,
            "message": "Login successful",
            "username": user["username"],
            "email": user["email"],
            "account_type": user["account_type"],
            "token": access_token
        }
    else:
        # File-based implementation
        users = get_users_from_file()
        found_user = None
        
        # Find user by username or email
        for user_id, user in users.items():
            if user["username"] == identifier or user["email"] == identifier:
                found_user = user
                break
        
        if not found_user:
            return {"success": False, "message": "User not found"}
        
        # Verify password
        if not verify_password(password, found_user["password"]):
            return {"success": False, "message": "Incorrect password"}
        
        # Update last login
        found_user["last_login"] = datetime.utcnow()
        save_users_to_file(users)
        
        # Generate token
        token_data = {
            "sub": str(found_user["user_id"]),
            "username": found_user["username"],
            "account_type": found_user["account_type"]
        }
        
        access_token = create_access_token(token_data)
        
        return {
            "success": True,
            "message": "Login successful",
            "username": found_user["username"],
            "email": found_user["email"],
            "account_type": found_user["account_type"],
            "token": access_token
        }

def get_current_user():
    """
    Get current authenticated user from session state
    
    Returns:
        User data if authenticated, None otherwise
    """
    if "token" in st.session_state:
        token = st.session_state.token
        user_data = verify_token(token)
        if user_data:
            return user_data
    
    return None

def update_user_preferences(user_id: str, preferences: dict):
    """
    Update user preferences
    
    Args:
        user_id: User ID
        preferences: New preferences dict
        
    Returns:
        Success message if update successful, error message otherwise
    """
    if MONGODB_AVAILABLE:
        result = users_collection.update_one(
            {"user_id": user_id},
            {"$set": {"preferences": preferences}}
        )
        
        if result.modified_count == 1 or result.matched_count == 1:
            return {"success": True, "message": "Preferences updated"}
        else:
            return {"success": False, "message": "Failed to update preferences"}
    else:
        users = get_users_from_file()
        
        if user_id not in users:
            return {"success": False, "message": "User not found"}
        
        users[user_id]["preferences"] = preferences
        save_users_to_file(users)
        
        return {"success": True, "message": "Preferences updated"}

def get_user_preferences(user_id: str):
    """
    Get user preferences
    
    Args:
        user_id: User ID
        
    Returns:
        User preferences dict
    """
    if MONGODB_AVAILABLE:
        user = users_collection.find_one({"user_id": user_id})
        if user and "preferences" in user:
            return user["preferences"]
    else:
        users = get_users_from_file()
        if user_id in users and "preferences" in users[user_id]:
            return users[user_id]["preferences"]
    
    return {}

def is_admin(user_data):
    """
    Check if user is an admin
    
    Args:
        user_data: User data dict
        
    Returns:
        True if user is admin, False otherwise
    """
    return user_data and user_data.get("account_type") == "admin"

def logout_user():
    """
    Logout current user by clearing session state
    """
    if "token" in st.session_state:
        del st.session_state.token
    
    if "user" in st.session_state:
        del st.session_state.user
