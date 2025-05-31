# GodsEye Extension and API Startup Script

# Display banner
Write-Host "=====================================
GodsEye News Analyzer
Version 1.2.0
=====================================
" -ForegroundColor Cyan

# Ensure we're in the right directory
Set-Location (Join-Path -Path $PSScriptRoot -ChildPath "python-app")

# Check for Python installation
try {
    $pythonVersion = python --version
    Write-Host "✓ Python detected: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✖ Python not found. Please install Python 3.8 or higher." -ForegroundColor Red
    exit 1
}

# Check for required packages
Write-Host "Checking dependencies..." -ForegroundColor Yellow
python check_dependencies.py

# Start the API server in a separate window
Write-Host "Starting GodsEye API Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-Command python run_app_with_api.py"

Write-Host "`n✓ API server starting on http://localhost:8503" -ForegroundColor Green
Write-Host "✓ Extension should now connect to the API automatically" -ForegroundColor Green

Write-Host "`nInstructions:" -ForegroundColor Cyan
Write-Host "1. Load the extension in Chrome from: browser-extension folder"
Write-Host "2. Navigate to any news article"
Write-Host "3. The GodsEye icon should appear and provide analysis"

Write-Host "`nPress Ctrl+C at any time to stop the script" -ForegroundColor Yellow
