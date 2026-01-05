import type { CanonEvaluation, CanonRule, ProposedPlan } from "./core";
import { PlanMustChangeFiles } from "./structure";
import { NoDestructiveActions } from "./safety";
import { ScopeContainment } from "./scope";
import { FounderOnlyCriticalChanges } from "./founder";

const CANON: CanonRule[] = [PlanMustChangeFiles, NoDestructiveActions, ScopeContainment, FounderOnlyCriticalChanges];

export function evaluateCanon(input: { intent: string; plan: ProposedPlan }): CanonEvaluation {
  for (const rule of CANON) {
    const result = rule.evaluate(input);
    if (!result.allowed) {
      return {
        allowed: false,
        rule: rule.id,
        reason: result.reason,
      };
    }
  }

  return { allowed: true };
}

export type { ProposedPlan } from "./core";
