export type CanonDecision = { allowed: true } | { allowed: false; reason: string };

export type ProposedPlanFileAction = "create" | "modify" | "delete";

export interface ProposedPlanFile {
  path: string;
  action: ProposedPlanFileAction;
  content: string;
}

export interface ProposedPlan {
  summary: string;
  files: ProposedPlanFile[];
}

export interface CanonRule {
  id: string;
  description: string;
  evaluate(input: { intent: string; plan: ProposedPlan }): CanonDecision;
}

export type CanonEvaluation =
  | { allowed: true }
  | {
      allowed: false;
      rule: string;
      reason: string;
    };
