# Claude → Bickford Execution Gate (Example)

Runs the type-safe execution gate exposed by `@bickford/claude-hook`.

## Run

From repo root:

```bash
pnpm -s typecheck
pnpm exec tsx examples/claude-bickford/run.ts
```

## Notes

- This example only exercises the **gate** + ledger append.
- It does not call Anthropic directly; it models a Claude tool output being gated before execution.
- The second call is a deterministic denial (contains "bypass" and trips canon rule `CAI-002`).
