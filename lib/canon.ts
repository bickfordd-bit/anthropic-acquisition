import { prisma } from "@/lib/prisma";
import { ANTHROPIC_CANON } from "@/canon/anthropic.canon";
export { evaluateCanon } from "./canon/index";
export type { ProposedPlan } from "./canon/core";

export function authorize(intent: string) {
  const normalized = intent.toLowerCase();

  if (normalized.includes("delete ledger") || normalized.includes("truncate ledger")) {
    return {
      decision: "DENY" as const,
      canon: "CANON-001",
      rationale: "Ledger is append-only and immutable",
      allowed: false,
    };
  }

  for (const rule of ANTHROPIC_CANON) {
    if (!rule.enforce(intent)) {
      return {
        decision: "DENY" as const,
        canon: rule.id,
        rationale: rule.rationale,
        allowed: false,
      };
    }
  }

  return {
    decision: "ALLOW" as const,
    canon: "CAI-ALLOW",
    rationale: "Intent conforms to Constitutional Canon",
    allowed: true,
  };
}

export async function getCanonSnapshot() {
  return prisma.canonEntry.findMany({
    orderBy: { promotedAt: "asc" },
  });
}
