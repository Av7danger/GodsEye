"""
Run GodsEye application with API server for Chrome extension
"""
import subprocess
import threading
import time
import os
import sys

# Add the current directory to the path to ensure imports work correctly
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Import the simple API server
from Api import start_server_thread

def run_streamlit_app():
    """Run the Streamlit app"""
    print("Starting Streamlit app...")
    subprocess.run(["streamlit", "run", "app.py"], 
                  cwd=os.path.dirname(os.path.abspath(__file__)))

def main():
    """Main function to run both servers"""
    print("GodsEye Application with API Server")
    print("===================================")
    
    # Start MongoDB if possible
    try:
        print("Starting MongoDB...")
        mongodb_process = subprocess.Popen(
            ["start_mongodb.bat"],
            cwd=os.path.dirname(os.path.abspath(__file__)),
            shell=True
        )
        time.sleep(3)  # Give MongoDB time to start
    except Exception as e:
        print(f"Warning: Could not start MongoDB: {e}")
        print("The application will still work with file-based storage.")
      # Start the API server in a separate thread
    print("Starting API server for Chrome extension...")
    api_thread = start_server_thread(port=8503)
    
    # Give the API server a moment to start
    time.sleep(2)
    
    print("\nAPI server is running at http://localhost:8503")
    print("You can now use the Chrome extension with this API server.")
    print("\nStarting the main GodsEye application...")
    
    # Start the Streamlit app in the main thread
    run_streamlit_app()

if __name__ == "__main__":
    main()
