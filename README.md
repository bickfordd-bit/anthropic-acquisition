# anthropic-acquisition

[![Netlify Status](https://api.netlify.com/api/v1/badges/9a23d6ed-49d7-41b2-9712-5a6da2007b0b/deploy-status)](https://app.netlify.com/projects/candid-moxie-b9ea70/deploys)

This repo now contains the **Bickford Live Filing UI**: a ledger-first authority surface wired to **OPTR gating**, **append-only ledger**, and **canon promotion**.

## Local dev

1. Copy env:
	- `cp .env.example .env.local`
2. Install deps:
	- `corepack enable`
	- `pnpm install`
3. Create DB + generate client:
	- `pnpm run prisma:migrate`
4. Run:
	- `pnpm run dev`

Open `http://localhost:3000`.

### Local Postgres (Docker)

This repo includes a Postgres service in `docker-compose.yml`. To use it locally:

```bash
# Choose a local DB password
export DB_PASSWORD="$(openssl rand -hex 16)"

# Start Postgres
docker compose up -d db

# Point Prisma at Postgres
export DATABASE_URL="postgresql://bickford:${DB_PASSWORD}@localhost:5432/bickford?schema=public"

# Create/update tables
pnpm run prisma:migrate
```

### Docker Compose (run app)

Once Postgres is running, you can start the app container too:

```bash
export DATA_ROOM_TOKEN="$(openssl rand -hex 32)"
export BICKFORD_API_TOKEN="$(openssl rand -hex 32)"

# Start both services (app + db)
docker compose up -d

# Or start just the app (if db is already up)
docker compose up -d app
```

## Environment variables

Minimum required:

- `DATA_ROOM_TOKEN` — protects export endpoints (`/api/data-room/export`, `/api/audit/pdf`, `/api/compliance*`). Generate with `openssl rand -hex 32`.

Required for ledger-backed features:

- `DATABASE_URL` — Prisma Postgres connection string.
	- Local Docker example: `postgresql://bickford:YOUR_PASSWORD@localhost:5432/bickford?schema=public`
	- Netlify DB: you can usually omit `DATABASE_URL`; the app will use `NETLIFY_DATABASE_URL_UNPOOLED` automatically.

Recommended (production):

- `BICKFORD_API_TOKEN` — bearer token for most write/compute API routes (e.g. `/api/execute`, `/api/chat/*`, `/api/ledger/*`). Generate with `openssl rand -hex 32`.

Founder-only execution (for `/api/bickford/execute`):

- `BICKFORD_EXECUTION_ENABLED` — must be `true` or execution is blocked.
- `BICKFORD_FOUNDER_KEY` — must be set or execution is blocked (use a long random value).
	- On Netlify, ensure this is set for the deploy contexts you use (Production, Deploy Previews, Branch deploys, etc.).
- `BICKFORD_PUBLIC_API` — set `true` only if you intentionally want unauthenticated access in production.

Self-editing from the deployed URL (recommended on Netlify):

- Set `GITHUB_TOKEN` + `BICKFORD_GITHUB_REPO` to let `/api/bickford/execute` create a GitHub PR instead of trying to run `git push`.
- If `NETLIFY_SITE_ID` + `NETLIFY_TOKEN` are set, the UI will also try to surface the deploy-preview URL for that PR/branch.

Optional:

- `ANTHROPIC_API_KEY` — enables live Claude integration.
- `DEMO_MODE` — set `true` for safe deterministic demo mode (no Claude calls; redacts intents).
- `ANTHROPIC_CHAT_MODEL`, `ANTHROPIC_INTENT_MODEL` — override defaults (falls back to `claude-3-5-sonnet-latest`).
- `BICKFORD_FOUNDER_MODE` — set `true` to allow Canon-approved changes to core execution paths (e.g. `/execute`, `/ledger`). Default is `false`.
- `OUTREACH_TOKEN` — protects `/api/outreach/trigger` (falls back to `DATA_ROOM_TOKEN`).
- `OPENAI_API_KEY` — enables the ChatGPT engine (only if you use that path).

Automation/scripts:

- `BICKFORD_BASE_URL` or `HEALTHCHECK_URL` — used by `pnpm run health:check` and remote verification scripts.
- `REQUIRE_REMOTE` — if `true`, `verifyRemoteDataRoom` fails when remote config is missing.
- `PUBLISH_GITHUB_RELEASE` — CI-only flag used by the demo workflow.

## Quick start (minimal)

Create a local env file (Next.js loads `.env.local` automatically):

```bash
export DATA_ROOM_TOKEN="$(openssl rand -hex 32)"
export BICKFORD_API_TOKEN="$(openssl rand -hex 32)"

cat > .env.local << 'EOF'
DATA_ROOM_TOKEN=__REPLACE__
BICKFORD_API_TOKEN=__REPLACE_API__
BICKFORD_PUBLIC_API=false
DATABASE_URL=postgresql://bickford:YOUR_PASSWORD@localhost:5432/bickford?schema=public
DEMO_MODE=false
EOF

# Inject the generated token
sed -i "s/__REPLACE__/${DATA_ROOM_TOKEN}/" .env.local
sed -i "s/__REPLACE_API__/${BICKFORD_API_TOKEN}/" .env.local
```

Run the app:

```bash
pnpm install
pnpm run prisma:migrate
pnpm run dev
```

Test endpoints:

```bash
# Health (no auth)
curl http://localhost:3000/api/health

# Data room export (auth)
curl -H "Authorization: Bearer $DATA_ROOM_TOKEN" \
	http://localhost:3000/api/data-room/export \
	--output test-export.zip

# Execute (Claude intent requires ANTHROPIC_API_KEY)
curl -X POST http://localhost:3000/api/execute \
	-H "Authorization: Bearer $BICKFORD_API_TOKEN" \
	-H "Content-Type: application/json" \
	-d '{"prompt":"Test prompt","useClaudeIntent":true}'
```

## Automation loops (GitHub Actions)

These run automatically from [.github/workflows](.github/workflows):

- Build + verify gate: [.github/workflows/build.yml](.github/workflows/build.yml)
- Sustainment (every 15 min): [.github/workflows/sustain.yml](.github/workflows/sustain.yml)
- Growth metrics (hourly): [.github/workflows/grow.yml](.github/workflows/grow.yml)
- Demo generator + recording: [.github/workflows/demo-autogen.yml](.github/workflows/demo-autogen.yml)

For sustainment to verify the deployed export, set repo secrets:

- `BICKFORD_BASE_URL` (e.g. `https://your-deploy.example.com`)
- `DATA_ROOM_TOKEN`

## Deploy (Vercel)

Vercel will detect Next.js from `package.json`.

Set `DATABASE_URL` in Vercel environment variables.

## Deploy (Netlify)

Netlify deploy uses the official Next.js runtime plugin and the repo already includes config:

- [netlify.toml](netlify.toml)
- [.env.netlify.template](.env.netlify.template)
- [NETLIFY_SETUP.md](NETLIFY_SETUP.md)

Quick CLI deploy:

1. `pnpm install`
2. `pnpm run netlify:login`
3. `pnpm run netlify:init`
4. `pnpm run netlify:deploy`

## Demo mode (safe + deterministic)

Set `DEMO_MODE=true` to redact returned intents in API responses and make Claude-based filing deterministic/offline (no `ANTHROPIC_API_KEY` required for demos).

## Claude → Bickford execution gate

This repo includes a production-style **execution authority layer** you can call from a Claude integration.

### Quick start

```bash
pnpm install
pnpm -s typecheck
pnpm exec tsx examples/claude-bickford/run.ts
```

### Usage

```ts
import { executeWithBickford } from "@bickford/claude-hook";

const result = await executeWithBickford({
	model: "claude",
	toolName: "some_tool",
	toolInput: "...", // Claude tool output or proposed action payload
});

if (result.allowed) {
	console.log("Authorized; ledger:", result.ledgerHash);
} else {
	console.log("Denied:", result.rationale);
}
```

### What it enforces

- Canon authorization via `@bickford/authority`
- Non-interference check via `@bickford/optr`
- Append-only provenance via `@bickford/ledger`

### Backward compatibility

Existing callers can continue using `bickfordExecuteFromClaude()` from `@bickford/claude-hook`.

## Audit + Compliance exports

These endpoints require `DATA_ROOM_TOKEN` and a `Bearer` Authorization header:

- `GET /api/data-room/export` → streams a deterministic ZIP export of the acquisition data room

The homepage also includes an “Export Data Room (ZIP)” button that prompts for the token and downloads the archive.

## Notes

- The legacy static pitch page remains as `index.html` (not used by Next.js).
