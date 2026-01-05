// lib/bickford/planner.ts
import { assertBickfordIdentity } from "@/lib/invariants/bickfordIdentity";
import { claudeProposePlan } from "@/lib/bickford/claudePlanner";
import fs from "node:fs";
import { evaluateCanon, type ProposedPlan } from "@/lib/canon";
import { appendLedgerEvent } from "@/lib/ledger/write";

export async function planFromIntent(intent: string, executionId: string) {
  assertBickfordIdentity("Bickford");

  const proposedPlan = await claudeProposePlan(intent);

  const normalized: ProposedPlan = {
    summary: String(proposedPlan?.summary ?? ""),
    files: Array.isArray(proposedPlan?.files)
      ? proposedPlan.files.map((f: any) => {
          const p = String(f?.path ?? "");
          const content = String(f?.content ?? "");
          const action = fs.existsSync(p) ? ("modify" as const) : ("create" as const);
          return { path: p, action, content };
        })
      : [],
  };

  const canonResult = evaluateCanon({ intent, plan: normalized });

  appendLedgerEvent({
    id: crypto.randomUUID(),
    executionId,
    type: "PLAN_GENERATED",
    summary: String(proposedPlan?.summary ?? "(no summary)"),
    details: { proposedPlan, normalized, canonResult },
    timestamp: new Date().toISOString(),
  });

  if (!canonResult.allowed) {
    appendLedgerEvent({
      id: crypto.randomUUID(),
      executionId,
      type: "CANON_DENIAL",
      summary: normalized.summary || String(proposedPlan?.summary ?? "(no summary)"),
      details: { canonResult, intent },
      timestamp: new Date().toISOString(),
    });

    throw new Error(`CANON DENIAL [${canonResult.rule}]: ${canonResult.reason}`);
  }

  return {
    ...proposedPlan,
    canon: canonResult,
    files: normalized.files,
  };
}
