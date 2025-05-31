"""
Simple API for the GodsEye Chrome extension
This simplified API handles requests from the Chrome extension
without requiring additional dependencies.
"""
import os
import sys
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import ssl
import threading
import socket
import random
from datetime import datetime

# Set up path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

# Import database functions if available
try:
    from database import database_history
    HAS_DATABASE = True
except ImportError:
    HAS_DATABASE = False
    print("Warning: database module not found. Using mock data only.")

# Import Gemini functions if available
try:
    from gemini import perspec
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False
    print("Warning: gemini module not found. Using mock data only.")

class SimpleHTTPRequestHandler(BaseHTTPRequestHandler):
    """Simple HTTP request handler with CORS support"""
    
    def do_OPTIONS(self):
        """Handle OPTIONS request for CORS preflight"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def do_GET(self):
        """Handle GET request"""
        # Parse URL
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        query = parse_qs(parsed_url.query)
        
        # Set CORS headers
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        # Root endpoint - health check
        if path == '/':
            response = {
                'status': 'ok',
                'message': 'GodsEye API is running',
                'timestamp': datetime.now().isoformat()
            }
            self.wfile.write(json.dumps(response).encode())
            return
        
        # API analyze endpoint
        if path == '/api/analyze':
            url = query.get('url', [''])[0]
            if not url:
                self.wfile.write(json.dumps({
                    'error': 'URL parameter is required'
                }).encode())
                return
            
            try:
                # Generate analysis data
                analysis = self.generate_analysis(url)
                
                # Store in database if available
                if HAS_DATABASE:
                    try:
                        database_history(url, analysis)
                        print(f"Analysis stored in database for URL: {url}")
                    except Exception as e:
                        print(f"Warning: Failed to store in database: {e}")
                
                print(f"Analysis generated for URL: {url}")
                self.wfile.write(json.dumps(analysis).encode())
            except Exception as e:
                error_message = f"Error analyzing URL {url}: {str(e)}"
                print(error_message)
                self.wfile.write(json.dumps({
                    'error': error_message
                }).encode())
        else:
            self.wfile.write(json.dumps({
                'error': f'Endpoint not found: {path}'
            }).encode())
    
    def generate_analysis(self, url):
        """Generate analysis data for the URL"""
        # Parse URL to get domain
        domain = urlparse(url).netloc
        
        # If Gemini is available, try to use it for real analysis
        if HAS_GEMINI:
            try:
                print(f"Using Gemini AI to analyze URL: {url}")
                # Create a basic article data structure
                article_data = {
                    'url': url,
                    'publisher': domain.split('.')[0].capitalize(),
                    'content': f"Content from {url}",  # Placeholder content
                    'authenticity': None,
                    'category': None,
                    'positive_percentage': None,
                    'neutral_percentage': None,
                    'negative_percentage': None
                }
                
                # Use Gemini AI to analyze and enrich the data
                enriched_data = perspec(article_data)
                print(f"Gemini analysis completed for URL: {url}")
                return enriched_data
            except Exception as e:
                print(f"Error using Gemini AI: {e}, falling back to mock data")
                # Fall back to mock data if Gemini fails
        
        # Generate mock data
        print(f"Generating mock analysis for URL: {url}")
        pos = random.randint(20, 70)
        neg = random.randint(10, 100 - pos)
        neutral = 100 - pos - neg
        
        # 20% chance of being marked as misinformation
        is_misinformation = random.random() < 0.2
        
        # Random topics
        topics = ['Politics', 'Health', 'Technology', 'Business', 'Entertainment']
        topic = random.choice(topics)
        
        return {
            'title': f"Article from {domain}",
            'url': url,
            'publisher': domain.split('.')[0].capitalize(),
            'category': topic,
            'positive_percentage': f"{pos}%",
            'neutral_percentage': f"{neutral}%",
            'negative_percentage': f"{neg}%",
            'authenticity': {
                'Misinformation Status': {
                    'Misinformation': 'Yes' if is_misinformation else 'No'
                },
                'Fact Check': {
                    'article_status': 'False' if is_misinformation else 'True',
                    'verified_claims': ['Claim 1', 'Claim 2'] if is_misinformation else []
                }
            }
        }

def find_available_port(start_port=8502, max_attempts=10):
    """Find an available port starting from start_port"""
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('localhost', port)) != 0:
                return port
    return start_port  # Default to start_port if no ports are available

def run_server(port=None):
    """Run the HTTP server"""
    if port is None:
        port = find_available_port()
        
    server_address = ('', port)
    httpd = HTTPServer(server_address, SimpleHTTPRequestHandler)
    
    print(f"Starting GodsEye API server on port {port}")
    print(f"API URL: http://localhost:{port}")
    print("Press Ctrl+C to stop the server")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("Server stopped")
    finally:
        httpd.server_close()

def start_server_thread(port=None):
    """Start the server in a separate thread"""
    server_thread = threading.Thread(target=run_server, args=(port,))
    server_thread.daemon = True
    server_thread.start()
    return server_thread

if __name__ == "__main__":
    run_server()
