# Netlify Deployment Guide

This repo is a Next.js app (App Router) and deploys cleanly to Netlify using `@netlify/plugin-nextjs`.

## One-time setup (recommended: Git integration)

1. Go to https://app.netlify.com/start
2. Import from Git → GitHub → select `bickfordd-bit/anthropic-acquisition`
3. Build settings:
   - Build command: `corepack enable && pnpm -w run build`
   - Publish directory: `.next` (Netlify plugin handles the runtime)
4. Add environment variables:
   - Copy from [.env.netlify.template](.env.netlify.template)

Minimum required:

- `DATA_ROOM_TOKEN`

Required for ledger-backed features (Executive dashboard, canon/ledger writes):

- `DATABASE_URL`

Netlify DB note:

- If you provision **Netlify DB**, Netlify sets `NETLIFY_DATABASE_URL` and `NETLIFY_DATABASE_URL_UNPOOLED` automatically.
- This repo maps those to `DATABASE_URL` automatically (see `lib/prisma.ts`), so you typically do **not** need to set `DATABASE_URL` manually.

Optional (recommended for full experience):

- `ANTHROPIC_API_KEY`
- `DEMO_MODE` (set `true` for safe demo mode)
5. Deploy.

After this, every `git push` to `main` triggers an automatic deploy.

## CLI deploy (manual)

```bash
pnpm install
pnpm run netlify:login
pnpm run netlify:init
pnpm run netlify:deploy
```

## Safe one-command helper (recommended)

This helper **does not commit or push secrets**. It generates local tokens for testing, runs a production build, then deploys.

One-time (interactive):

```bash
pnpm run netlify:login
pnpm run netlify:init
```

Deploy:

```bash
# Preview deploy
./scripts/deploy-netlify.sh

# Production deploy
./scripts/deploy-netlify.sh --prod
```

Note: set real secrets (especially `ANTHROPIC_API_KEY`) in Netlify environment variables (see `.env.netlify.template`).

Preview deploy:

```bash
pnpm run netlify:preview
```

## Autonomous helper script

Preview deploy:

```bash
pnpm run deploy:netlify
```

Production deploy:

```bash
pnpm run deploy:netlify -- --prod
```

If you want it to also commit + push before deploy:

```bash
pnpm run deploy:netlify -- --prod --push
```

## Optional: GitHub Actions deploy

This repo includes [.github/workflows/netlify-deploy.yml](.github/workflows/netlify-deploy.yml), but it auto-skips unless you set secrets:

- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

If you’re using Netlify Git integration, you can ignore the workflow.
