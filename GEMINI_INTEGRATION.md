# GodsEye Gemini API Integration

This document explains how the GodsEye Chrome extension integrates with Google's Gemini API for AI-powered news analysis.

## Overview

The GodsEye Chrome extension uses Google's Gemini API to provide advanced AI-powered analysis of news articles, including:

- **Sentiment Analysis**: Determining the positive, neutral, and negative sentiment percentages in news content
- **Misinformation Detection**: Identifying potentially false information in articles
- **Content Categorization**: Classifying articles into topic categories
- **Authenticity Assessment**: Providing structured analysis of information reliability

## Setup Instructions

To use the Gemini API integration:

1. **Get a Gemini API Key**:
   - Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create a new API key
   - Copy the key for the next step

2. **Configure the API Key**:
   - Run the Gemini setup script:
     ```
     python setup_gemini_api.py
     ```
   - Follow the prompts to enter your API key
   - Alternatively, manually add your API key to `python-app/.env`:
     ```
     GEMINI_API_KEY=your_api_key_here
     ```

3. **Test the Integration**:
   - Start the API server:
     ```
     cd python-app
     python api_simple.py
     ```
   - The server will print the port it's running on (typically 8503)
   - Test with a sample request:
     ```
     Invoke-RestMethod -Uri "http://localhost:8503/api/analyze?url=https://example.com/news/article" -Method GET
     ```

## How It Works

1. **API Request Flow**:
   - The Chrome extension sends a request to the API server with a news article URL
   - The API server uses the `generate_analysis` method to process the URL
   - If Gemini is available, it creates a basic article data structure and sends it to Gemini

2. **Gemini Processing**:
   - The `perspec` function in `gemini.py` handles communication with the Gemini API
   - The Gemini model is configured with safety settings to properly analyze news content
   - The model reads from `metadata/gemini_instructions.md` to understand how to analyze articles

3. **API Response**:
   - Gemini returns enriched data including sentiment percentages and authenticity information
   - The API server formats this data and sends it back to the extension
   - If Gemini is unavailable, the API falls back to mock data generation

## Troubleshooting

- **API Key Issues**: If you see "Error using Gemini AI" in the server logs, check that your API key is valid
- **Connection Issues**: Make sure the Chrome extension's BACKEND_API_URL in background.js matches the port your API server is running on
- **Model Response Issues**: If the model returns unexpected results, check the system instructions in `metadata/gemini_instructions.md`

## Advanced Configuration

The Gemini integration can be customized by modifying:

- **Model Parameters**: Edit generation_config in `gemini.py` to adjust temperature, maximum tokens, etc.
- **System Instructions**: Modify `metadata/gemini_instructions.md` to change how Gemini analyzes articles
- **Safety Settings**: Adjust safety_settings in `gemini.py` to control content filtering
