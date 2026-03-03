@echo off
setlocal
echo ==========================================
echo       ToolCrib Backend Startup Script
echo ==========================================
cd /d "%~dp0"

REM --- OPTIONAL: Set your Python path manually here if auto-detection fails ---
REM Example: set MANUAL_PYTHON_PATH=C:\Python310\python.exe
set MANUAL_PYTHON_PATH=C:\Users\Ivan.Corona\AppData\Local\Programs\Python\Python312\python.exe

if defined MANUAL_PYTHON_PATH (
    if exist "%MANUAL_PYTHON_PATH%" (
        set PY_CMD="%MANUAL_PYTHON_PATH%"
        goto start
    ) else (
        echo [WARNING] Manual path not found: %MANUAL_PYTHON_PATH%
    )
)

REM --- Auto-Detection ---
echo [INFO] Detecting Python...

REM Try standard 'python'
python --version >nul 2>&1
if %errorlevel% equ 0 (
    set PY_CMD=py -3.12thon
    goto start
)

REM Try 'py' launcher
py --version >nul 2>&1
if %errorlevel% equ 0 (
    set PY_CMD=py -3.12
    goto start
)

REM Try 'python3'
python3 --version >nul 2>&1
if %errorlevel% equ 0 (
    set PY_CMD=py -3.12thon3
    goto start
)

echo [ERROR] Python not found in PATH!
echo.
echo Please install Python 3.10+ from python.org or the Microsoft Store.
echo If it is installed, add it to your PATH or edit this script to set MANUAL_PYTHON_PATH.
echo.
pause
exit /b 1

:start
echo [INFO] Using Python: %PY_CMD%

REM Check if requirements are installed
echo [INFO] Checking dependencies...
echo %PY_CMD% > python_path.txt
%PY_CMD% -c "import fastapi, uvicorn, supabase" >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Missing dependencies. Installing...
    %PY_CMD% -m pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies. Check your internet connection.
        pause
        exit /b 1
    )
) else (
    echo [INFO] Dependencies OK.
)

echo.
echo [TX] Starting FastAPI on port 8001...
echo [TX] Swagger UI: http://localhost:8002/docs
echo.

%PY_CMD% -m uvicorn app.main:app --reload --reload-exclude frontend --host 0.0.0.0 --port 8002

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Server crashed. See output above.
    pause
    exit /b 1
)

pause
