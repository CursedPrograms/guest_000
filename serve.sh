#!/usr/bin/env sh
cd "$(dirname "$0")"
echo "guest_000 on http://localhost:8666  (Ctrl+C to stop)"
( sleep 1; xdg-open http://localhost:8666 2>/dev/null || open http://localhost:8666 2>/dev/null ) &
python3 -m http.server 8666
