@echo off
echo ==========================================
echo       ToolCrib Frontend Startup Script
echo ==========================================
cd /d "%~dp0frontend"

echo [TX] Starting Vite...
echo.
cmd /c "npm run dev"

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Frontend failed to start.
    pause
    exit /b 1
)

pause
