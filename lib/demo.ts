import { hashEntry } from "@/lib/hash";

export function isDemoMode() {
  const v = (process.env.DEMO_MODE ?? process.env.NEXT_PUBLIC_DEMO_MODE ?? "").toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function redactIfDemo<T extends Record<string, any>>(entry: T): T {
  if (!isDemoMode()) return entry;

  if (typeof entry.intent === "string") {
    return {
      ...entry,
      intent: "[REDACTED — DEMO MODE]",
    };
  }

  return entry;
}

// Deterministic intent generator for exec demos when external models are unavailable.
export function demoGenerateIntent(prompt: string) {
  const cleaned = String(prompt ?? "").trim();
  const summary = cleaned.length > 120 ? `${cleaned.slice(0, 117)}…` : cleaned;
  return `DEMO_INTENT: ${summary}`;
}

export function demoIntentHash(intent: string) {
  return hashEntry(intent);
}
