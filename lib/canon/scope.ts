import type { CanonRule } from "./core";

export const ScopeContainment: CanonRule = {
  id: "CANON-SCOPE-001",
  description: "Plan must match declared intent",

  evaluate({ intent, plan }) {
    const intentText = String(intent ?? "").trim();
    const planSummary = String(plan?.summary ?? "").toLowerCase();

    const firstToken = intentText.split(/\s+/).filter(Boolean)[0]?.toLowerCase() ?? "";
    if (!firstToken) return { allowed: true };

    if (!planSummary.includes(firstToken)) {
      return {
        allowed: false,
        reason: "Plan summary does not align with intent",
      };
    }

    return { allowed: true };
  },
};
