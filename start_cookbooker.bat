@echo off
setlocal EnableDelayedExpansion
cls

REM ================================
REM    Cookbooker Voice Assistant
REM    Startup Script v1.0
REM ================================

echo.
echo ================================
echo    Cookbooker v0.0.2
echo    Voice Recipe Assistant
echo ================================
echo.

REM Check if Python is available
echo [INFO] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.8+ from python.org
    echo.
    pause
    exit /b 1
)

REM Get Python version for display
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo [OK] Python !PYTHON_VERSION! found

REM Check if we're in the correct directory
echo [INFO] Verifying project structure...
if not exist "project_data\server.py" (
    echo [ERROR] project_data\server.py not found
    echo         Please run this script from the recipe-maker root directory
    echo.
    pause
    exit /b 1
)

if not exist "project_data\index.html" (
    echo [ERROR] project_data\index.html not found
    echo         Project files appear to be missing
    echo.
    pause
    exit /b 1
)

echo [OK] Project structure verified

REM Check for .env file
echo [INFO] Checking configuration...
if not exist "project_data\.env" (
    echo [WARN] .env file not found - OpenAI API key may be missing
    echo        You can add your API key later in the settings
)

REM Change to project_data directory
cd project_data

REM Check if requirements.txt exists and install dependencies
echo [INFO] Installing/updating dependencies...
if exist "requirements.txt" (
    python -m pip install -r requirements.txt --quiet --disable-pip-version-check
) else (
    python -m pip install fastapi uvicorn python-dotenv openai psutil httpx requests python-multipart --quiet --disable-pip-version-check
)

if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    echo         Please check your internet connection and try again
    echo.
    pause
    exit /b 1
)

echo [OK] Dependencies ready
echo.
echo [INFO] Starting Cookbooker server...
echo [INFO] Server will be available at: http://localhost:8000
echo [INFO] Browser will open automatically in 3 seconds
echo.
echo [INFO] Press Ctrl+C to stop the server when done
echo.

REM Kill any existing processes on port 8000 first
echo [INFO] Checking for existing processes on port 8000...
python -c "import psutil; [proc.kill() for proc in psutil.process_iter(['pid', 'name', 'connections']) if any(hasattr(conn, 'laddr') and conn.laddr and conn.laddr.port == 8000 for conn in (proc.info['connections'] or []))]; print('[OK] Port 8000 cleared')" 2>nul

REM Start server and capture any immediate errors
start /B python -m uvicorn server:app --host 0.0.0.0 --port 8000 --log-level warning

REM Wait for server to start
timeout /t 3 /nobreak >nul

REM Open browser
start "" "http://localhost:8000"

echo [OK] Server started and browser opened
echo.
echo [INFO] Server is running in the background
echo        Close this window or press Ctrl+C to stop
echo.

REM Wait for user to stop the server
pause >nul

echo.
echo [INFO] Stopping server...
taskkill /f /im python.exe >nul 2>&1
echo [OK] Server stopped
echo.
echo Thanks for using Cookbooker!
pause
