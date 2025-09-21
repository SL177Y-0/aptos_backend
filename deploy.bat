@echo off
echo  Aptos Contract Deployer - Universal Deployment
echo ==================================================

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo  Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo  npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo  Node.js and npm found

REM Install dependencies
echo  Installing dependencies...
npm install

REM Check if Aptos CLI is installed
aptos --version >nul 2>&1
if errorlevel 1 (
    echo   Aptos CLI not found. Please install from https://aptos.dev/build/cli
    echo Then run: aptos init
    pause
    exit /b 1
) else (
    echo  Aptos CLI found
    aptos --version
)

REM Test Move compilation
echo  Testing Move compilation...
aptos move compile
if errorlevel 1 (
    echo  Move compilation failed
    pause
    exit /b 1
)

echo  Move compilation successful

REM Start the server
echo  Starting Aptos Contract Deployer...
echo  Server will be available at: http://localhost:3000
echo  Health check: http://localhost:3000/health
echo.
echo Press Ctrl+C to stop the server
echo.

npm start
pause
