@echo off
cls
echo.
echo ================================
echo    Cookbooker 0.0.2
echo    Voice Recipe Assistant
echo ================================
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found. Please install Python first.
    pause
    exit /b 1
)

REM Check if we're in the right directory with project_data
if not exist "project_data\server.py" (
    echo ❌ project_data\server.py not found. Please run this from the recipe-maker directory.
    pause
    exit /b 1
)

REM Change to project_data directory
cd project_data

REM Install dependencies silently
echo 📦 Installing dependencies...
python -m pip install fastapi uvicorn python-dotenv openai psutil httpx requests python-multipart >nul 2>&1

echo ✅ Dependencies ready
echo 🌟 Starting server...
echo 🔗 Will open at: http://localhost:8000
echo.

REM Start server in background and then open browser
start /B python -m uvicorn server:app --host 0.0.0.0 --port 8000

REM Wait a moment for server to start, then open browser
timeout /t 3 /nobreak >nul
start "" "http://localhost:8000"

REM Keep the window open to show server is running
echo ✅ Server running and browser opened
echo Press Ctrl+C to stop the server
pause

echo.
echo ✅ Server stopped
pause
