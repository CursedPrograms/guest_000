Set-Location $PSScriptRoot
Write-Host "guest_000 on http://localhost:8666  (Ctrl+C to stop)"
Start-Process "http://localhost:8666"
python -m http.server 8666
