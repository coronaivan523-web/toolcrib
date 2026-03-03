@echo off
echo [INFO] Stopping existing Node/Python processes...
taskkill /F /IM python.exe /IM node.exe /IM uvicorn.exe 2>nul

echo [INFO] Starting Backend...
start "ToolCrib Backend" cmd /k "py -3.12 -m uvicorn app.main:app --reload --reload-exclude frontend --host 0.0.0.0 --port 8002"

echo [INFO] Starting Frontend...
cd frontend
start "ToolCrib Frontend" cmd /k "npm run dev"

echo [INFO] Systems starting. Please check the two new windows.
pause
