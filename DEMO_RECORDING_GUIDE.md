# 🎥 Demo Recording & Optional Auto-Publish

This repo already has a demo pipeline under `scripts/demo/`.

## Quick start

### Option A: Record from local dev server

Terminal 1:

```bash
pnpm run dev
```

Terminal 2:

```bash
pnpm run demo:full
```

### Option B: Record from a deployed site

```bash
export DEMO_URL=https://your-site.netlify.app
pnpm run demo:full
```

## What `demo:full` does

1. Checks `GET /api/health`
2. Generates a short narration script (`demo/script.txt`)
3. Runs API demo scenarios (only if `DATA_ROOM_TOKEN` is set)
4. Records a UI walkthrough + screenshots
5. Packages artifacts (and optionally publishes a GitHub Release)

## Outputs

- `demo/screenshots/`
  - `01-homepage.png`
  - `02-executive-dashboard.png` (best-effort)
  - `03-filing-prompt.png` (best-effort)
  - `04-execution-result.png` (best-effort)
  - `05-detail-*.png` (best-effort)
- `demo/videos/`
  - `demo-recording.webm`
  - `demo-recording.mp4` (only if `ffmpeg` is available)
- `demo/publish.json`

## Environment variables

- `DEMO_URL` (or `BICKFORD_BASE_URL`): base URL to record
- `DEMO_HEADFUL=true`: shows the browser while recording
- `DATA_ROOM_TOKEN`: enables the data-room export step in `demo:run`

## Optional: Publish to GitHub Releases (no `gh` required)

Publishing is controlled by `scripts/demo/publish.ts` and is **off by default**.

To publish, set:

```bash
export PUBLISH_GITHUB_RELEASE=true
export GITHUB_TOKEN=...               # token with repo release permissions
export GITHUB_REPOSITORY=owner/repo   # e.g. bickfordd-bit/anthropic-acquisition
pnpm run demo:publish
```

It creates/updates a release tagged `demo-<shortsha>` and uploads:
- `demo/script.txt`
- `demo/publish.json`
- `demo/artifacts/*` (if present)
- `demo/screenshots/*`
- `demo/videos/*`

## Troubleshooting

- Health check fails: ensure `pnpm run dev` is running or set `DEMO_URL`.
- No MP4: install ffmpeg in the dev container (`sudo apt-get update && sudo apt-get install -y ffmpeg`).
- Recording steps are “best-effort”: if a UI element isn’t present, the script still records a usable walkthrough.
