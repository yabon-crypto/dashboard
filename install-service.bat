@echo off
cd /d "%~dp0"
echo Installing DailyDashboard as system startup task...
schtasks /CREATE /SC ONSTART /TN "DailyDashboard" /TR "wscript.exe \"%~dp0watchdog.vbs\"" /RL HIGHEST /F
if %errorlevel% equ 0 (
    echo Success! The server will auto-start on boot.
) else (
    echo Failed. Try running this file as Administrator.
)
pause
