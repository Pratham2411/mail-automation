@echo off
title RecruiterReach Setup
echo.
echo ============================================
echo   RecruiterReach - One-Click Setup (Windows)
echo ============================================
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Download the LTS version and re-run this script.
    echo.
    start https://nodejs.org/
    pause
    exit /b 1
)

:: Show Node version
for /f "tokens=*" %%i in ('node -v') do set NODE_VER=%%i
echo [OK] Node.js %NODE_VER% detected
echo.

:: Navigate to app directory
cd /d "%~dp0app"

:: Create data directory
if not exist "data" (
    mkdir data
    echo [OK] Created data directory
) else (
    echo [OK] Data directory exists
)

:: Install dependencies
echo.
echo Installing dependencies (this may take a minute)...
echo.
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm install failed. Check your internet connection.
    pause
    exit /b 1
)
echo.
echo [OK] Dependencies installed

:: Run database seed
echo.
echo Setting up database...
node -e "const{seedDatabase}=require('./src/lib/seed');seedDatabase();" 2>nul
echo [OK] Database ready

:: Start the dev server
echo.
echo ============================================
echo   Starting RecruiterReach...
echo   Open http://localhost:3000 in your browser
echo ============================================
echo.
echo Press Ctrl+C to stop the server.
echo.
start http://localhost:3000
call npm run dev
