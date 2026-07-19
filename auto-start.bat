@echo off
set PATH=C:\tools\node\node-v20.11.1-win-x64;%PATH%
cd /d "C:\Users\user\Documents\Default Project"
start /min "Dashboard-Backend" cmd /c "cd backend && npm run dev"
timeout /t 5 /nobreak >nul
start /min "Dashboard-Frontend" cmd /c "cd frontend && npm run dev"
exit
