#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat << 'EOF'
Netlify autonomous deploy helper

Usage:
  ./scripts/netlify-auto-deploy.sh [--prod] [--commit] [--push]

Flags:
  --prod    Deploy to production (default: preview)
  --commit  Commit local changes before deploy
  --push    Push to origin/main after commit (implies --commit)
EOF
}

prod=false
do_commit=false
do_push=false

for arg in "$@"; do
  case "$arg" in
    --prod)
      prod=true
      ;;
    --commit)
      do_commit=true
      ;;
    --push)
      do_commit=true
      do_push=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $arg" >&2
      usage
      exit 1
      ;;
  esac
done

echo "🔍 Validating minimal env…"
if [[ -z "${DATA_ROOM_TOKEN:-}" ]]; then
  echo "⚠️  DATA_ROOM_TOKEN not set (required for protected export endpoints)"
fi

echo "📦 Installing deps (if needed)…"
pnpm install

# Set Sentry release version for tracking
if [[ -d .git ]]; then
  export SENTRY_RELEASE="$(git rev-parse HEAD)"
  echo "📊 Sentry release: ${SENTRY_RELEASE}"
fi

echo "🏗️  Building…"
pnpm run build

echo "🔎 Typecheck…"
pnpm run typecheck

if $do_commit; then
  echo "📝 Committing changes…"
  git add -A
  git commit -m "Netlify deploy: $(date -u '+%Y-%m-%d %H:%M:%S UTC')" || echo "No changes to commit"
fi

if $do_push; then
  echo "📤 Pushing to origin/main…"
  git push origin main
fi

echo "🚀 Deploying via Netlify CLI…"
if $prod; then
  pnpm exec netlify deploy --build --prod
else
  pnpm exec netlify deploy --build
fi
