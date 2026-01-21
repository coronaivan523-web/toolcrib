@echo off
echo ==========================================
echo      KILLING ALL PYTHON ZOMBIES
echo ==========================================
taskkill /F /IM python.exe
taskkill /F /IM python3.exe
taskkill /F /IM py.exe
taskkill /F /IM uvicorn.exe
echo.
echo All Python processes killed.
echo.
echo waiting 3 seconds...
timeout /t 3
echo.
echo Restarting Backend...
call start_backend.bat
