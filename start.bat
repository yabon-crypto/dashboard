@echo off
set PATH=C:\tools\node\node-v20.11.1-win-x64;%PATH%
cd /d "%~dp0"
start "Backend" cmd /c "cd backend && npm run dev"
timeout /t 3 /nobreak >nul
start "Frontend" cmd /c "cd frontend && npm run dev"
echo.
echo DONE! Open http://localhost:5173 in your browser.
echo.
pause
