$url = "https://daily-dashboard-8d0f.onrender.com/api/auth/status"
try {
    Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30 | Out-Null
} catch {
    # Server might be waking up, ignore errors
}
