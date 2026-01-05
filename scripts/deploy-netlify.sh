#!/usr/bin/env bash
set -euo pipefail

usage() {
	cat <<'EOF'
Safe Netlify deploy helper (no secret commits)

Usage:
	./scripts/deploy-netlify.sh [--prod]

What it does:
	- Generates DATA_ROOM_TOKEN / OUTREACH_TOKEN (if not already set)
	- Writes a local .env.local (gitignored) for local testing
	- Runs pnpm install + pnpm build
	- Deploys via Netlify CLI (requires you to have already linked the site)

Prereqs (one-time):
	- netlify login
	- netlify init   (or netlify link)

Flags:
	--prod   Deploy to production (default: preview)
EOF
}

prod=false
for arg in "$@"; do
	case "$arg" in
		--prod)
			prod=true
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

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if ! command -v openssl >/dev/null 2>&1; then
	echo "openssl is required to generate tokens" >&2
	exit 1
fi

export DATA_ROOM_TOKEN="${DATA_ROOM_TOKEN:-$(openssl rand -hex 32)}"
export OUTREACH_TOKEN="${OUTREACH_TOKEN:-$(openssl rand -hex 32)}"

echo "🔐 DATA_ROOM_TOKEN=$DATA_ROOM_TOKEN"
echo "🔐 OUTREACH_TOKEN=$OUTREACH_TOKEN"

if [[ -z "${DATABASE_URL:-}" ]]; then
	export DATABASE_URL="file:./dev.db"
fi

if [[ -z "${DEMO_MODE:-}" ]]; then
	export DEMO_MODE="true"
fi

# .env.local is gitignored by default in this repo.
cat > .env.local <<EOF
DATA_ROOM_TOKEN=$DATA_ROOM_TOKEN
OUTREACH_TOKEN=$OUTREACH_TOKEN
DATABASE_URL=$DATABASE_URL
DEMO_MODE=$DEMO_MODE
NODE_ENV=development

# Optional: set in Netlify dashboard instead of here
# ANTHROPIC_API_KEY=sk-ant-api03-...
EOF

echo "✅ Wrote local env to .env.local (gitignored)"

echo "📦 Installing deps…"
corepack enable >/dev/null 2>&1 || true
pnpm install

echo "🏗️  Building…"
pnpm run build

echo "✅ Build OK"

echo "🚀 Deploying via Netlify CLI…"
if $prod; then
	echo "(production)"
	pnpm exec netlify deploy --build --prod
else
	echo "(preview)"
	pnpm exec netlify deploy --build
fi
