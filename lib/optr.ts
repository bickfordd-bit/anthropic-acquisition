export function scoreOPTR(intent: { risk?: number; allowedRisk?: number }) {
  const risk = intent.risk ?? 0;
  const allowedRisk = intent.allowedRisk ?? 0;

  if (risk > allowedRisk) {
    return { admissible: false as const, reason: "Risk exceeds invariant" };
  }

  // Stable score (avoid Math.random authority)
  const score = ((allowedRisk + 1) / (risk + 1)).toFixed(4);
  return { admissible: true as const, score };
}
