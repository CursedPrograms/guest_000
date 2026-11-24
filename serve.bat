@echo off
cd /d "%~dp0"
echo guest_000 on http://localhost:8666  (Ctrl+C to stop)
start "" http://localhost:8666
python -m http.server 8666
