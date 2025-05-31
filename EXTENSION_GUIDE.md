# GodsEye Chrome Extension Guide

## What's Included
This Chrome extension connects to your GodsEye backend and provides real-time news analysis including:
- Sentiment analysis (positive/negative/neutral)
- Misinformation detection
- Article metadata

## Setup Instructions

### Step 1: Set Up Gemini API (Optional but Recommended)
1. Get a Gemini API key from Google AI Studio:
   - Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create a new API key
   - Copy the key for the next step

2. Run the Gemini setup script:
   ```
   cd c:\Users\ACER\Desktop\projects\GodsEye
   python setup_gemini_api.py
   ```
   This will guide you through setting up the API key.

### Step 2: Start the Backend Services
1. Open a command prompt and navigate to your GodsEye python-app directory:
   ```
   cd c:\Users\ACER\Desktop\projects\GodsEye\python-app
   ```

2. Start MongoDB using the batch script:
   ```
   start_mongodb.bat
   ```

3. Start the simplified API server:
   ```
   python api_simple.py
   ```
   This will start the API server on port 8503.

   > **Note:** The server may run on a different port if 8503 is already in use. Check the console output for the actual port number and update the extension's background.js file if necessary.

4. In a separate command prompt, start the main GodsEye application:
   ```
   cd c:\Users\ACER\Desktop\projects\GodsEye\python-app
   streamlit run app.py
   ```

### Step 2: Install the Chrome Extension
1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer mode" using the toggle in the top-right corner
3. Click "Load unpacked" and select the `browser-extension` folder from your GodsEye project
4. The extension should now appear in your Chrome toolbar

### Step 3: Using the Extension
1. Navigate to any news article on the web
2. Click the GodsEye icon in the Chrome toolbar to activate the extension
3. The extension panel will display:
   - Summary of the article
   - Sentiment analysis with percentages
   - Authenticity assessment
   - Article metadata

4. You can bookmark analyzed articles by clicking the bookmark icon

## Testing with a Test Page
1. Use the included test page to verify the extension functionality:
   ```
   cd c:\Users\ACER\Desktop\projects\GodsEye
   python serve_test_page.py
   ```
2. This will open a test news article in your browser
3. Click on the GodsEye icon in the extension toolbar or the sidebar to analyze this page
4. Verify that sentiment analysis and authenticity data appears correctly

## Troubleshooting
If the extension doesn't connect to the backend:
1. Ensure MongoDB is running
2. Check that the API server is running on port 8502
3. Verify the URL in the extension's background.js matches your API endpoint
4. Check the browser console for any error messages
5. Make sure the extension has permission to access the API via the correct host_permissions

## Alternative Setups
You can also use the combined script to start both the GodsEye app and API server:
```
cd c:\Users\ACER\Desktop\projects\GodsEye\python-app
python run_app_with_api.py
```
