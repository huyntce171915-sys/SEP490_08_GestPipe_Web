@echo off
title GestPipe - Install All Dependencies (PM2 Version)
echo ===================================================
echo      GESTPIPE WEB - INSTALLATION SCRIPT
echo ===================================================

:: 1. Install PM2 Globally
echo.
echo [1/4] Installing PM2 Process Manager...
call npm install -g pm2
if %errorlevel% neq 0 (
    echo [WARNING] Could not install PM2 globally. Trying local install...
)

:: 2. Install Python Dependencies
echo.
echo [2/4] Installing Python Libraries...

:: Try to find Python 3.11 via py launcher
echo Checking for Python 3.11...
py -3.11 --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Found Python 3.11. Using it for installation.
    py -3.11 -m pip install -r requirements.txt
    
    :: Create a config file to tell backend to use this python
    echo [INFO] Saving Python 3.11 path for Backend...
    py -3.11 -c "import sys; print(sys.executable)" > python_path.txt
    set /p PYTHON_PATH=<python_path.txt
    del python_path.txt
) else (
    echo [WARNING] Python 3.11 not found via 'py' launcher.
    echo Checking for Python 3.10...
    py -3.10 --version >nul 2>&1
    if %errorlevel% equ 0 (
        echo [INFO] Found Python 3.10. Using it for installation.
        py -3.10 -m pip install -r requirements.txt
        
        echo [INFO] Saving Python 3.10 path for Backend...
        py -3.10 -c "import sys; print(sys.executable)" > python_path.txt
        set /p PYTHON_PATH=<python_path.txt
        del python_path.txt
    ) else (
        echo [WARNING] Neither Python 3.11 nor 3.10 found. Using default 'python'.
        echo [WARNING] If default python is 3.13+, MediaPipe may fail!
        python -m pip install -r requirements.txt
        set PYTHON_PATH=python
    )
)

:: 3. Install Backend Dependencies
echo.
echo [3/4] Installing Backend Node Modules...
cd SEP490_08_GestPipe_WebApplication\backend
call npm install
cd ..\..

:: 4. Install Frontend Dependencies
echo.
echo [4/4] Installing Frontend Node Modules...
cd SEP490_08_GestPipe_WebApplication\frontend
call npm install
cd ..\..

:: 5. Setup Environment Files
echo.
echo [5/5] Setting up Environment Files...
if exist ".env" (
    echo Copying .env to backend...
    copy /Y ".env" "SEP490_08_GestPipe_WebApplication\backend\.env"
) else (
    echo [WARNING] .env file not found in root!
)

if exist "credentials.json" (
    echo Copying credentials.json to backend services...
    copy /Y "credentials.json" "SEP490_08_GestPipe_WebApplication\backend\services\credentials.json"
)

if exist "token.json" (
    echo Copying token.json to backend services...
    copy /Y "token.json" "SEP490_08_GestPipe_WebApplication\backend\services\token.json"
)

:: 6. Configure Python for Backend
if defined PYTHON_PATH (
    if not "%PYTHON_PATH%"=="python" (
        echo.
        echo [6/6] Configuring Backend to use: %PYTHON_PATH%
        echo PYTHON_BIN=%PYTHON_PATH%>> "SEP490_08_GestPipe_WebApplication\backend\.env"
    )
)

echo.
echo ===================================================
echo      INSTALLATION COMPLETE!
echo ===================================================
echo Please unzip 'secrets.zip' (password required) before running.
echo Then run 'run_project.bat' to start.
pause
