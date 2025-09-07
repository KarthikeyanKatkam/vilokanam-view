@echo off
REM Vilokanam-view Development Setup Script

echo Setting up Vilokanam-view development environment...

REM Create necessary directories
echo Creating directories...
mkdir backend\api 2>nul
mkdir signaling-server 2>nul

REM Install frontend dependencies
echo Installing frontend dependencies...
cd frontend
npm install

REM Install signaling server dependencies
echo Installing signaling server dependencies...
cd ..\signaling-server
npm install

REM Install API dependencies
echo Installing API dependencies...
cd ..\backend\api
npm install

REM Return to root directory
cd ..\..

echo Development environment setup complete!
echo.
echo To start the development environment:
echo 1. Run 'docker-compose -f docker-compose.dev.yml up' to start backend services
echo 2. Run 'cd frontend\apps\viewer && npm run dev' to start the viewer app
echo 3. Run 'cd frontend\apps\creator && npm run dev' to start the creator app