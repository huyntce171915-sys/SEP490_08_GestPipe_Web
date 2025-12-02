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
python -m pip install -r requirements.txt

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

echo.
echo ===================================================
echo      INSTALLATION COMPLETE!
echo ===================================================
echo Please unzip 'secrets.zip' (password required) before running.
echo Then run 'run_project.bat' to start.
pause
