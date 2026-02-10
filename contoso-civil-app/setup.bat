@echo off
REM Initial setup script for Contoso Civil App

echo.
echo 🚀 Contoso Civil App - Setup Script
echo ====================================
echo.

REM Check prerequisites
echo ✓ Checking prerequisites...
where node >nul 2>nul
if errorlevel 1 (
    echo ❌ Node.js not found. Please install Node.js 18+
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i

echo ✓ Node.js version: %NODE_VERSION%
echo ✓ npm version: %NPM_VERSION%
echo.

REM Setup environment file
echo ✓ Setting up environment file...
if not exist .env (
    copy .env.example .env
    echo ✓ Created .env file
    echo ⚠️  Please update .env with your configuration
) else (
    echo ✓ .env file already exists
)
echo.

REM Install dependencies
echo ✓ Installing dependencies...
call npm install --workspaces
echo ✓ Dependencies installed
echo.

REM Ask to start with Docker
set /p DOCKER_START="Do you want to start services with Docker? (y/n): "
if /i "%DOCKER_START%"=="y" (
    echo ✓ Starting services with Docker Compose...
    call npm run docker:up
    echo.
    echo ✅ Services are running!
    echo.
    echo Access points:
    echo   - Frontend: http://localhost:3100
    echo   - API Gateway: http://localhost:3000/api
    echo   - Database: localhost:1433
) else (
    echo ✓ Skipped Docker startup
    echo.
    echo To start services manually, run:
    echo   npm run docker:up
)

echo.
echo ✅ Setup complete!
pause
