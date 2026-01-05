#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PORT="${PORT:-3000}"
HEALTH_URL="${HEALTH_URL:-http://localhost:${PORT}/api/health}"
INTERVAL_SECONDS="${INTERVAL_SECONDS:-30}"

start_server() {
  if [[ ! -d ".next" ]]; then
    echo "📦 No .next build found; building first..."
    pnpm run build
  fi

  echo "🚀 Starting server on port ${PORT}..."
  (pnpm start -- -p "${PORT}") >/tmp/auto-heal-server.log 2>&1 &
}

is_server_running() {
  pgrep -f "next start" >/dev/null 2>&1
}

is_server_healthy() {
  curl -fsS "${HEALTH_URL}" >/dev/null 2>&1
}

echo "🏥 Auto-heal monitor starting"
echo "- PORT=${PORT}"
echo "- HEALTH_URL=${HEALTH_URL}"
echo "- INTERVAL_SECONDS=${INTERVAL_SECONDS}"

while true; do
  if ! is_server_running; then
    echo "⚠️  Server not running; starting..."
    start_server
    sleep 2
  fi

  if ! is_server_healthy; then
    echo "⚠️  Server unhealthy; restarting..."
    pkill -f "next start" >/dev/null 2>&1 || true
    start_server
  else
    echo "✅ Server healthy ($(date -u '+%Y-%m-%dT%H:%M:%SZ'))"
  fi

  sleep "${INTERVAL_SECONDS}"
done