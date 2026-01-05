#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3000}"
HEALTH_URL="${HEALTH_URL:-http://localhost:${PORT}/api/health}"

json_pretty_print() {
  if command -v jq >/dev/null 2>&1; then
    jq .
  else
    python -m json.tool
  fi
}

echo "🔍 Checking deployment status..."
echo ""

echo "📊 GitHub Actions (latest 3):"
if command -v gh >/dev/null 2>&1; then
  gh run list --limit 3 || true
else
  echo "  ⚠️  GitHub CLI (gh) not installed"
fi

echo ""

echo "🏥 Local Health (${HEALTH_URL}):"
if curl -fsS "${HEALTH_URL}" 2>/dev/null | json_pretty_print; then
  echo "  ✅ Local server healthy"
else
  echo "  ❌ Local server not running or unhealthy"
fi