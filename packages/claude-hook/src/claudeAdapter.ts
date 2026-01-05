import type { AuthorizationDecision, Intent } from "@bickford/types";

import type { ClaudeExecutionRequest, ClaudeExecutionResult } from "./types";

export type ClaudeHookDeps = {
  authorize?: (intent: Intent) => AuthorizationDecision | Promise<AuthorizationDecision>;
  ledgerAppend?: (
    intent: Intent,
    decision: AuthorizationDecision,
    meta?: Record<string, unknown>,
  ) => Promise<{ hash: string }>;
  violatesNonInterference?: (params: {
    actor: string;
    action: string;
    ttvImpact: Record<string, number>;
  }) => { violated: boolean; agent?: string; delta?: number };
};

async function defaultAuthorize(intent: Intent) {
  const mod = await import("@bickford/authority");
  return mod.authorize(intent);
}

async function defaultLedgerAppend(
  intent: Intent,
  decision: AuthorizationDecision,
  meta: Record<string, unknown> = {},
) {
  const mod = await import("@bickford/ledger");
  return mod.ledger.append(intent, decision, meta);
}

async function defaultViolatesNonInterference(params: {
  actor: string;
  action: string;
  ttvImpact: Record<string, number>;
}) {
  const mod = await import("@bickford/optr");
  return mod.violatesNonInterference(params);
}

export async function executeWithBickford(
  req: ClaudeExecutionRequest,
  deps: ClaudeHookDeps = {},
): Promise<ClaudeExecutionResult> {
  const intent: Intent = {
    action: req.toolName,
    params: {
      input: req.toolInput,
      conversationId: req.conversationId,
      customerId: req.customerId,
    },
    origin: req.origin ?? "claude",
    timestamp: new Date().toISOString(),
  };

  // 1) Canon authorization
  const authorizeFn = deps.authorize ?? defaultAuthorize;
  const decision = await authorizeFn(intent);

  // 2) Non-interference enforcement
  const violatesNI = deps.violatesNonInterference ?? defaultViolatesNonInterference;
  const ni = await violatesNI({
    actor: req.actor ?? "claude",
    action: req.toolName,
    ttvImpact: req.ttvImpact ?? {},
  });

  const finalDecision = ni.violated
    ? {
        allowed: false,
        decision: "DENY" as const,
        canon: "NI-001",
        rationale: `Action degrades agent ${ni.agent} TTV`,
      }
    : decision;

  // 3) Ledger append (ALWAYS)
  const ledgerAppend = deps.ledgerAppend ?? defaultLedgerAppend;
  const entry = await ledgerAppend(intent, finalDecision, {
    model: req.model,
    surface: "claude-hook",
    conversationId: req.conversationId ?? null,
    customerId: req.customerId ?? null,
  });

  return {
    allowed: finalDecision.allowed,
    rationale: finalDecision.rationale,
    ledgerHash: entry.hash,
    canon: finalDecision.canon,
    decision: finalDecision.decision,
  };
}

export async function executeWithBickfordOrThrow(
  req: ClaudeExecutionRequest,
  deps: ClaudeHookDeps = {},
): Promise<ClaudeExecutionResult> {
  const result = await executeWithBickford(req, deps);
  if (!result.allowed) {
    throw new Error(`BICKFORD DENY: ${result.canon ?? "UNKNOWN"} — ${result.rationale} (ledger: ${result.ledgerHash})`);
  }
  return result;
}

