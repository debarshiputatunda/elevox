@echo off
setlocal
set ROOT=%~dp0

echo Starting Elebox backend (port 8001)...
start "Elebox Backend" cmd /k "cd /d %ROOT%elebox_backend && .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001"

echo Starting Elebox frontend (port 5173)...
start "Elebox Frontend" cmd /k "cd /d %ROOT%elebox_frontend && npm run dev"

echo Waiting for servers to boot...
timeout /t 6 /nobreak >nul

echo Opening browser...
start "" http://localhost:5173

echo Elebox started. Close the two terminal windows or run stop.bat to stop.
endlocal
