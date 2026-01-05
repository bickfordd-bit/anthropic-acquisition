import type { CanonRule } from "./core";

function isFounderAuthorized(): boolean {
  // Zero-UI-friction, ops-controlled gate.
  return process.env.BICKFORD_FOUNDER_MODE === "true";
}

export const FounderOnlyCriticalChanges: CanonRule = {
  id: "CANON-FOUNDER-001",
  description: "Only founder-authorized execution may touch core execution paths",

  evaluate({ plan }) {
    const touchesCore = (plan.files ?? []).some(f => {
      const p = String(f.path ?? "");
      return p.includes("/execute") || p.includes("/ledger") || p.startsWith("lib/ledger/") || p.startsWith("app/api/execute/");
    });

    if (touchesCore && !isFounderAuthorized()) {
      return {
        allowed: false,
        reason: "Core execution paths may only be modified in founder mode (set BICKFORD_FOUNDER_MODE=true)",
      };
    }

    return { allowed: true };
  },
};
