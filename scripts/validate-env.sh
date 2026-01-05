#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

load_dotenv() {
  if [[ "${SKIP_DOTENV_LOAD:-}" == "1" || "${SKIP_DOTENV_LOAD:-}" == "true" || "${SKIP_DOTENV_LOAD:-}" == "TRUE" ]]; then
    echo "⚠️  SKIP_DOTENV_LOAD is set; not loading .env files"
    return 0
  fi

  local env_files=(
    "$ROOT_DIR/.env.local"
    "$ROOT_DIR/.env"
    "$ROOT_DIR/.env.production.local"
    "$ROOT_DIR/.env.production"
    "$ROOT_DIR/.env.development.local"
    "$ROOT_DIR/.env.development"
  )

  for env_file in "${env_files[@]}"; do
    if [[ -f "$env_file" ]]; then
      echo "📄 Loading env from $(basename "$env_file")"
      set -a
      # shellcheck disable=SC1090
      source "$env_file"
      set +a
    fi
  done
}

echo "🔍 Validating environment..."

load_dotenv

skip="${SKIP_ENV_VALIDATION:-}"
if [[ "$skip" == "1" || "$skip" == "true" || "$skip" == "TRUE" ]]; then
  echo "⚠️  SKIP_ENV_VALIDATION is set; skipping validation"
  exit 0
fi

REQUIRED_VARS=(
  "DATABASE_URL"
  "DATA_ROOM_TOKEN"
)

# If this is a production deployment and the API isn't explicitly public,
# require a separate bearer token for the app API routes.
if [[ "${NODE_ENV:-}" == "production" && "${BICKFORD_PUBLIC_API:-false}" != "true" ]]; then
  REQUIRED_VARS+=("BICKFORD_API_TOKEN")
fi

OPTIONAL_VARS=(
  "ANTHROPIC_API_KEY"
  "ANTHROPIC_CHAT_MODEL"
  "ANTHROPIC_INTENT_MODEL"
  "DEMO_MODE"
  "OUTREACH_TOKEN"
  "BICKFORD_PUBLIC_API"
  "BICKFORD_MAX_JSON_BYTES"
  "BICKFORD_BASE_URL"
  "HEALTHCHECK_URL"
  "REQUIRE_REMOTE"
  "PUBLISH_GITHUB_RELEASE"
)

missing=0

for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "❌ Missing required: ${var}"
    missing=1
  else
    echo "✅ Found: ${var}"
  fi
done

for var in "${OPTIONAL_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "⚠️  Optional missing: ${var} (will use defaults)"
  else
    echo "✅ Found: ${var}"
  fi
done

if [[ "$missing" -eq 1 ]]; then
  echo ""
  echo "❌ Environment validation failed"
  exit 1
fi

echo ""
echo "✅ Environment validation passed"