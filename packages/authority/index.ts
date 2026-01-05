import type { AuthorizationDecision, Intent } from "@bickford/types";
import { authorize as authorizeCanon } from "@/lib/canon";

function canonicalizeIntent(intent: Intent) {
  const params: any = intent.params as any;
  const request = typeof params?.request === "string" ? String(params.request) : "";
  const input = typeof params?.input === "string" ? String(params.input) : "";
  const action = String(intent.action ?? "");
  // Keep it stable + human readable.
  const payload = request || input;
  return action && payload ? `${action}: ${payload}` : action || payload;
}

export function authorize(intent: Intent): AuthorizationDecision {
  const text = canonicalizeIntent(intent);
  const decision = authorizeCanon(text);

  return {
    allowed: decision.allowed,
    decision: decision.decision,
    canon: decision.canon,
    rationale: decision.rationale,
  };
}
