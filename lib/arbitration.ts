import { enforceNonInterference } from "@/lib/nonInterference";

export type ArbitrationResult =
  | { allowed: true }
  | { allowed: false; reason: string };

export function arbitrate(intents: string[]): ArbitrationResult {
  // First, apply the existing non-interference invariant to every intent.
  for (const intent of intents) {
    const ni = enforceNonInterference(intent);
    if (!ni.ok) return { allowed: false, reason: ni.reason };
  }

  const normalized = intents.map((i) => i.toLowerCase());

  // Minimal multi-agent interference heuristic: "override" intent mixed with any other intent.
  const conflict = normalized.some((a, i) =>
    normalized.some((b, j) => i !== j && a.includes("override") && b.trim().length > 0),
  );

  if (conflict) {
    return { allowed: false, reason: "Multi-agent interference detected" };
  }

  return { allowed: true };
}
