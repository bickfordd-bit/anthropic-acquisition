#!/bin/bash
set -euo pipefail

echo "🎬 ============================================"
echo "   RECORD & (OPTIONALLY) PUBLISH DEMO"
echo "============================================"
echo ""

DEMO_URL="${DEMO_URL:-${BICKFORD_BASE_URL:-http://localhost:3000}}"
DEMO_URL="${DEMO_URL%/}"

echo "🔍 Checking app health at $DEMO_URL ..."
if ! curl -fsS "$DEMO_URL/api/health" >/dev/null 2>&1; then
  echo "❌ App not reachable at $DEMO_URL"
  echo ""
  echo "Start the server first:"
  echo "  pnpm run dev"
  echo ""
  echo "Or set DEMO_URL/BICKFORD_BASE_URL to your deployed site."
  exit 1
fi

echo "✅ App is healthy"
echo ""

echo "📝 Generating demo script..."
pnpm run -s demo:generate

echo "🧪 Running API demo scenarios (skips export if DATA_ROOM_TOKEN missing)..."
if [ -n "${DATA_ROOM_TOKEN:-}" ]; then
  pnpm run -s demo:run
else
  echo "⚠️  DATA_ROOM_TOKEN not set; skipping demo:run (data-room export step requires it)"
fi

echo "🎥 Recording UI walkthrough..."
pnpm run -s demo:record

echo "📦 Packaging demo artifacts..."
pnpm run -s demo:publish

echo ""
echo "✅ Demo recorded and packaged"
echo ""
echo "Artifacts:"
echo "  - demo/screenshots/*.png"
echo "  - demo/videos/demo-recording.webm (and .mp4 if ffmpeg available)"
echo "  - demo/publish.json"
echo ""
echo "Optional GitHub Release publish:"
echo "  export PUBLISH_GITHUB_RELEASE=true"
echo "  export GITHUB_TOKEN=..."
echo "  export GITHUB_REPOSITORY=owner/repo"
echo "  pnpm run demo:publish"
