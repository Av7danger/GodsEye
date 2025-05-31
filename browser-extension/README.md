# GodsEye Browser Extension v1.2.0

GodsEye is a powerful news analysis browser extension that helps users evaluate the credibility, bias, and sentiment of online news articles.

## Features

- **Bias Detection**: Automatically identifies political and ideological bias in news articles
- **Sentiment Analysis**: Analyzes the emotional tone of content
- **Fact-checking Integration**: Flags potential misinformation and questionable claims
- **Community Rating**: See what other users think about the source
- **Privacy Features**: Built-in tracker blocking and enhanced privacy options
- **Dark Mode**: Easy on the eyes with a sleek dark interface
- **History & Bookmarks**: Save and track your analyzed articles
- **Data Export/Import**: Backup and transfer your analysis history

## Installation Instructions

### Loading the Extension in Developer Mode

1. Open Chrome and navigate to `chrome://extensions`
2. Enable "Developer mode" by toggling the switch in the top-right corner
3. Click "Load unpacked" and select the `browser-extension` folder from your GodsEye project
4. The GodsEye extension should now be installed and visible in your extensions list

### Installing from Packaged Extension

1. Run the packaging script: `python package_extension.py`
2. Open Chrome and navigate to `chrome://extensions`
3. Enable "Developer mode" by toggling the switch in the top-right corner
4. Drag and drop the generated `.zip` file from the `dist` folder onto the Chrome extensions page

## Setting Up the Backend API

Before using the extension, you need to start the GodsEye backend services:

### Quick Start (Recommended)

Run the provided startup script from the project root:

```
.\start_godseye.ps1
```

### Manual Setup

1. Start MongoDB:   ```bash
   cd python-app
   start_mongodb.bat
   ```

2. Start the API server:
   ```bash
   cd python-app
   python Api.py
   ```
   
   The API server will start on port 8503 by default.
   ```

2. Start the GodsEye application with API server:
   ```
   cd python-app
   python run_app_with_api.py
   ```

This will start:
- The main GodsEye Streamlit application on port 8501
- The API server for the Chrome extension on port 8502

## Using the Extension

1. Navigate to any news article on the web
2. Click the GodsEye icon in the browser toolbar
3. The extension will analyze the current page and display:
   - Summary of the content
   - Sentiment analysis (positive/negative)
   - Authenticity assessment
   - Detailed article metadata

4. You can save analyzed articles to your bookmarks by clicking the bookmark icon

## Troubleshooting

If the extension doesn't connect to the backend:
1. Make sure MongoDB is running
2. Verify the API server is running on port 8502
3. Check the browser console for any connection errors

## Permissions Required

The extension requires:
- `activeTab` permission to access the current page
- `storage` permission to save bookmarks
- Access to `localhost` to connect to the backend API
