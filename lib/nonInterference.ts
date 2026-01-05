import { violatesNonInterference } from "@bickford/optr";

export function enforceNonInterference(
  intent: string,
  opts?: {
    actor?: string;
    action?: string;
    ttvImpact?: Record<string, number>;
  },
) {
  const normalized = intent.toLowerCase();

  // Baseline runtime safeguard: block any attempt to override the kernel.
  if (/override|bypass|ignore\s+canon/.test(normalized)) {
    return { ok: false as const, code: "NI-000", reason: "Interference risk detected" };
  }

  if (opts?.ttvImpact && opts.actor) {
    const action = opts.action ?? opts.actor;
    const ni = violatesNonInterference({
      actor: opts.actor,
      action,
      ttvImpact: opts.ttvImpact,
    });

    if (ni.violated) {
      return {
        ok: false as const,
        code: "NI-001",
        reason: "Action increases another agent’s TTV",
        violatedAgent: ni.agent,
        delta: ni.delta,
      };
    }
  }

  return { ok: true as const };
}
