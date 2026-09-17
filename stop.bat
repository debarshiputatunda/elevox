@echo off
setlocal

echo Stopping Elebox servers...

REM Close the launched cmd windows (and their child servers) by matching the
REM command line. This is robust even when npm/vite renames the window title.
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -eq 'cmd.exe' -and $_.CommandLine -match 'elebox_backend|elebox_frontend' } | ForEach-Object { taskkill /F /T /PID $_.ProcessId }" >nul 2>&1

REM Fallback: free the known ports in case a server is still listening.
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8001 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

REM Fallback: close by the original window titles too.
taskkill /FI "WINDOWTITLE eq Elebox Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq Elebox Frontend*" /T /F >nul 2>&1

echo Elebox stopped.
endlocal
