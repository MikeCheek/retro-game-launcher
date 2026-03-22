@echo off
REM Retro Game Launcher Setup Script for Windows

echo.
echo =================================
echo   Retro Game Launcher - Setup
echo =================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed!
    echo Please download and install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js detected
node --version

echo.
echo Installing dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)

echo [OK] Dependencies installed

echo.
echo Setup complete! 
echo To start the application, run: npm start
echo.
pause
