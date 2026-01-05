import type { CanonRule } from "./core";

export const PlanMustChangeFiles: CanonRule = {
  id: "CANON-STRUCT-001",
  description: "Plan must propose at least one file change",

  evaluate({ plan }) {
    if (!Array.isArray(plan.files) || plan.files.length === 0) {
      return {
        allowed: false,
        reason: "No file-level change proposed",
      };
    }

    return { allowed: true };
  },
};
