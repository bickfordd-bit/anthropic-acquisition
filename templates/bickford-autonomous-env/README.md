# Bickford Autonomous Environment Creation Template

This is a meta-template that turns an **intent** into an **environment spec**, then generates a new Bickford environment on disk.

By default it runs in **plan** mode (dry-run): it writes a generated README/spec and returns the action plan. Executing external side-effects (git/GitHub/deploy) is explicitly gated behind environment variables.

## Key files

- `intent-processor.ts`: parses natural language intent into an `EnvironmentSpec`
- `environment-generator.ts`: generates the environment (plan/execute)
- `web-ui-integration.ts`: integration wrapper + JSONL ledger
- `cli.ts`: CLI entry for local usage
- `template.manifest.json`: capability + lifecycle manifest

## Safety model

The generator will only perform destructive/external actions when both conditions are true:

1) Mode is `execute`
2) An allow env var is set

Allow env vars:

- `BICKFORD_AUTONOMOUS_ENABLE_GIT=true`
- `BICKFORD_AUTONOMOUS_ENABLE_GITHUB=true`
- `BICKFORD_AUTONOMOUS_ENABLE_DEPLOY=true`

Other config:

- `BICKFORD_WORKSPACE_ROOT=/tmp/bickford-envs`
- `BICKFORD_TEMPLATE_SOURCE_ROOT=/workspaces/anthropic-acquisition` (defaults to current working directory)
- `BICKFORD_LEDGER_PATH=.bickford/intent-executions.jsonl`

## CLI usage

Plan only (safe default):

```bash
pnpm exec tsx templates/bickford-autonomous-env/cli.ts create "Create a HIPAA compliance system, deploy to Netlify"
```

Execute (requires allow env vars):

```bash
BICKFORD_AUTONOMOUS_MODE=execute \
BICKFORD_AUTONOMOUS_ENABLE_GIT=true \
BICKFORD_AUTONOMOUS_ENABLE_GITHUB=true \
BICKFORD_AUTONOMOUS_ENABLE_DEPLOY=true \
pnpm exec tsx templates/bickford-autonomous-env/cli.ts create "Build a trading bot with SEC compliance" --execute
```

## Web API

The repo also exposes a Next.js route at `POST /api/intent/autonomous-env`.

- Default: returns a **plan**
- To execute: send `{ "mode": "execute" }` and set `BICKFORD_AUTONOMOUS_EXECUTE=true` server-side.
