#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-4000}"

echo "==> Сборка web-приложения..."
cd "$ROOT/mobile"
npm run build:web

echo "==> Запуск сервера на порту $PORT (QR с публичной ссылкой)..."
cd "$ROOT/server"
kill "$(lsof -t -i :$PORT 2>/dev/null)" 2>/dev/null || true
sleep 1

export AUTO_NGROK=1
npm start
