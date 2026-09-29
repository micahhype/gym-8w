#!/usr/bin/env bash
# Chạy test end-to-end: tự bật http.server + Chrome headless, chạy e2e.mjs, rồi tắt đúng hai tiến trình đó.
# Dùng: tests/run.sh   (cần python3, google-chrome, node ≥ 22)
set -u
cd "$(dirname "$0")/.."
PROFILE=$(mktemp -d)
python3 -m http.server 8765 >/dev/null 2>&1 & SRV=$!
google-chrome --headless=new --remote-debugging-port=9333 --user-data-dir="$PROFILE" about:blank >/dev/null 2>&1 & CHR=$!
trap 'kill $SRV $CHR 2>/dev/null; rm -rf "$PROFILE"' EXIT
for _ in $(seq 1 30); do curl -s localhost:9333/json >/dev/null && curl -s localhost:8765 >/dev/null && break; sleep 0.3; done
node tests/e2e.mjs "$@"
