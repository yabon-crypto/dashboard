Write-Host "=== 每日儀表板啟動腳本 ===" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path "backend\.env")) {
    Copy-Item "backend\.env.example" "backend\.env"
    Write-Host "已建立 .env 檔案，請編輯填入你的 API 金鑰" -ForegroundColor Yellow
}

Write-Host "安裝後端相依套件..." -ForegroundColor Green
Set-Location backend
npm install
if ($?) { Write-Host "後端相依套件安裝完成" -ForegroundColor Green }

Write-Host "安裝前端相依套件..." -ForegroundColor Green
Set-Location ..\frontend
npm install
if ($?) { Write-Host "前端相依套件安裝完成" -ForegroundColor Green }

Set-Location ..

Write-Host ""
Write-Host "啟動後端伺服器 (port 3001)..." -ForegroundColor Cyan
$backend = Start-Process powershell -ArgumentList "-NoExit -Command cd '$pwd\backend'; npm run dev" -PassThru

Write-Host "啟動前端開發伺服器 (port 5173)..." -ForegroundColor Cyan
$frontend = Start-Process powershell -ArgumentList "-NoExit -Command cd '$pwd\frontend'; npm run dev" -PassThru

Write-Host ""
Write-Host "=== 啟動完成 ===" -ForegroundColor Green
Write-Host "前端: http://localhost:5173" -ForegroundColor Cyan
Write-Host "後端: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "按任意鍵關閉兩個伺服器..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Stop-Process -Id $backend.Id -ErrorAction SilentlyContinue
Stop-Process -Id $frontend.Id -ErrorAction SilentlyContinue
