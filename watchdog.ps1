$nodeDir = "C:\tools\node\node-v20.11.1-win-x64"
$backendDir = "C:\Users\user\Documents\Default Project\backend"
$frontendDir = "C:\Users\user\Documents\Default Project\frontend"
$env:Path = "$nodeDir;$env:Path"
$log = "C:\Users\user\Documents\Default Project\watchdog.log"

while ($true) {
    $back = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match "backend" }
    $front = Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match "frontend" }
    
    if (-not $back) {
        "$(Get-Date) Starting backend..." | Out-File $log -Append
        Start-Process powershell "-NoProfile -Command $env:Path='$nodeDir;'+$env:Path; Set-Location '$backendDir'; npm run dev" -WindowStyle Hidden
    }
    if (-not $front) {
        "$(Get-Date) Starting frontend..." | Out-File $log -Append
        Start-Process powershell "-NoProfile -Command $env:Path='$nodeDir;'+$env:Path; Set-Location '$frontendDir'; npm run dev" -WindowStyle Hidden
    }
    Start-Sleep -Seconds 60
}
