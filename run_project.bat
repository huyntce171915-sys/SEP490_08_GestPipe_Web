@echo off
title GestPipe - Launcher (PM2)
echo ===================================================
echo      GESTPIPE WEB - STARTING SYSTEM (PM2)
echo ===================================================

:: Start PM2
echo.
echo [1/2] Starting Processes with PM2...
call pm2 start ecosystem.config.js

:: Open Browser
echo.
echo [2/2] Opening Web Browser...
timeout /t 5 >nul
start http://localhost:3000

echo.
echo ===================================================
echo      SYSTEM IS RUNNING IN BACKGROUND
echo ===================================================
echo Backend API: http://localhost:5000
echo Frontend:    http://localhost:3000
echo.
echo To stop the system, run 'stop_project.bat'
echo To view logs, run 'pm2 monit'
echo.
pause
