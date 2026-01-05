#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "🤖 Autonomous deploy: starting"

echo "📦 Build"
pnpm run build

echo "🔎 Typecheck"
pnpm run typecheck

if [[ "${RUN_REMOTE_HEALTHCHECK:-}" == "1" ]]; then
  echo "🏥 Remote health check"
  pnpm run health:check
else
  echo "ℹ️  Skipping remote health check (set RUN_REMOTE_HEALTHCHECK=1)"
fi

if [[ "${AUTO_GIT_COMMIT:-}" == "1" ]]; then
  echo "🧾 Git commit"
  git add -A
  git commit -m "Auto-deploy: $(date -u '+%Y-%m-%dT%H:%M:%SZ')" || echo "No changes to commit"
else
  echo "ℹ️  Skipping git commit (set AUTO_GIT_COMMIT=1)"
fi

if [[ "${AUTO_GIT_PUSH:-}" == "1" ]]; then
  echo "📤 Git push"
  git push
else
  echo "ℹ️  Skipping git push (set AUTO_GIT_PUSH=1)"
fi

echo "✅ Autonomous deploy: complete"