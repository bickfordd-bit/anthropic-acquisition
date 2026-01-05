import type { AuthorizationDecision } from "@bickford/types";

import { authorize } from "@/lib/canon";
import { appendLedger } from "@/lib/ledger";

export interface ClaudeAction {
  intent: string;
  arguments: Record<string, any>;
  modelOutput: string;
}

export interface ExecutionDecision {
  allowed: boolean;
  canonRule: string;
  rationale: string;
  ledgerHash: string;
}

function toAuthorizationDecision(intent: string): AuthorizationDecision {
  const res = authorize(intent);
  return {
    allowed: res.allowed,
    decision: res.decision,
    canon: res.canon,
    rationale: res.rationale,
  };
}

// Claude reasons -> Bickford authorizes -> execution proceeds.
// This is the enforced execution boundary Anthropic will probe.
export async function executeWithBickford(action: ClaudeAction): Promise<ExecutionDecision> {
  const decision = toAuthorizationDecision(action.intent);

  const entry = await appendLedger({
    type: "claude_gate",
    timestamp: new Date().toISOString(),
    intent: action.intent,
    arguments: action.arguments,
    modelOutput: action.modelOutput,
    decision: decision.allowed ? "ALLOW" : "DENY",
    canon: decision.canon,
    rationale: decision.rationale,
    actor: "claude",
    origin: "claude",
    systemInitiated: true,
  });

  if (!decision.allowed) {
    throw new Error(`BICKFORD DENY: ${decision.canon} — ${decision.rationale} (ledger: ${entry.hash})`);
  }

  return {
    allowed: true,
    canonRule: decision.canon,
    rationale: decision.rationale,
    ledgerHash: entry.hash,
  };
}
