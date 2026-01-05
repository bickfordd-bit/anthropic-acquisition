// lib/canon/core.ts

import { ANTHROPIC_CANON } from "@/canon/anthropic.canon";

export interface CanonEvaluation {
  allowed: boolean;
  decision: "ALLOW" | "DENY";
  canon: string;
  rationale: string;
}

export interface Plan {
  summary: string;
  files: Array<{ path: string; content: string }>;
  requiresDeploy: boolean;
}

/**
 * Evaluates a plan against Canon rules
 * @param plan - The proposed execution plan
 * @returns Canon evaluation with decision and rationale
 */
export function evaluatePlan(plan: Plan): CanonEvaluation {
  // Check for ledger modifications
  const touchesLedger = plan.files.some(
    (f) => f.path.includes("ledger") || f.path.includes("bickford-ledger.jsonl")
  );
  
  if (touchesLedger) {
    return {
      allowed: false,
      decision: "DENY",
      canon: "CANON-001",
      rationale: "Ledger is append-only and immutable - direct modifications forbidden",
    };
  }

  // Check for node_modules modifications
  const touchesNodeModules = plan.files.some((f) => f.path.includes("node_modules"));
  
  if (touchesNodeModules) {
    return {
      allowed: false,
      decision: "DENY",
      canon: "CANON-002",
      rationale: "node_modules modifications forbidden - use package.json instead",
    };
  }

  // Check file-level changes (must have at least one file)
  if (plan.files.length === 0) {
    return {
      allowed: false,
      decision: "DENY",
      canon: "CANON-003",
      rationale: "Plans must include file-level changes",
    };
  }

  // Check against Anthropic Constitutional Canon
  const intentText = plan.summary;
  for (const rule of ANTHROPIC_CANON) {
    if (!rule.enforce(intentText)) {
      return {
        allowed: false,
        decision: "DENY",
        canon: rule.id,
        rationale: rule.rationale,
      };
    }
  }

  // All checks passed
  return {
    allowed: true,
    decision: "ALLOW",
    canon: "CANON-ALLOW",
    rationale: "Plan conforms to all Canon rules",
  };
}
