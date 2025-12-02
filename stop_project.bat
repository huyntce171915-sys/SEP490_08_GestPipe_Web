@echo off
title GestPipe - Stop System
echo ===================================================
echo      STOPPING GESTPIPE SYSTEM
echo ===================================================

call pm2 stop all
call pm2 delete all

echo.
echo System stopped successfully.
pause
