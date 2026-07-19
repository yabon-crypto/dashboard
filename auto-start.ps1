$nodeDir = "C:\tools\node\node-v20.11.1-win-x64"
$env:Path = "$nodeDir;$env:Path"
$backendDir = "C:\Users\user\Documents\Default Project\backend"
$frontendDir = "C:\Users\user\Documents\Default Project\frontend"

$logFile = "$env:TEMP\dashboard-startup.log"
Start-Process powershell -ArgumentList "-NoProfile -Command `$env:Path='$nodeDir;'+`$env:Path; Set-Location '$backendDir'; npm run dev" -WindowStyle Hidden
Start-Sleep 5
Start-Process powershell -ArgumentList "-NoProfile -Command `$env:Path='$nodeDir;'+`$env:Path; Set-Location '$frontendDir'; npm run dev" -WindowStyle Hidden
"Started at $(Get-Date)" | Out-File $logFile
