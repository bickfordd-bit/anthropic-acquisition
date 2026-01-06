import type { LedgerEvent } from "@/lib/ledger/types";

function q(value: unknown): string {
  const s = typeof value === "string" ? value : value == null ? "" : String(value);
  return s.trim();
}

export function renderDemoScript(event: LedgerEvent): string {
  if (event.type === "CANON_DENIAL") {
    const details = (event.details ?? {}) as any;
    const intent = q(details.intent);
    const rule = q(details?.canonResult?.rule);
    const reason = q(details?.canonResult?.reason);

    return `Bickford — Canon enforcement (denial)\n\nExecutionId: ${event.executionId}\nTimestamp: ${event.timestamp}\n\nIntent proposed:\n"${intent || "(missing intent)"}"\n\nDenied because:\n"${reason || "(missing reason)"}"\n\nApplied rule:\n"${rule || "(missing rule)"}"\n\nThis is deterministic safety derived from the ledger.`;
  }

  const details = (event.details ?? {}) as any;
  const url = q(details.url);

  return `Bickford — Autonomous execution (success)\n\nExecutionId: ${event.executionId}\nTimestamp: ${event.timestamp}\n\nLedger event:\n${event.type} — ${event.summary}\n\nDeploy URL:\n${url || "(no url)"}\n\nThis demo is derived from the append-only ledger: truth → proof.`;
}
