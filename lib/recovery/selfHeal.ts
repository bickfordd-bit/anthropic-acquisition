import { appendLedgerEvent } from "@/lib/ledger/write";
import type { FailureReason } from "@/lib/recovery/analyzeFailure";

export async function selfHeal(executionId: string, reason: FailureReason, error: unknown) {
  const message = String((error as any)?.message ?? error ?? "");
  appendLedgerEvent({
    id: crypto.randomUUID(),
    executionId,
    type: "SELF_HEAL_RECORDED",
    summary: "Self-heal recorded",
    details: {
      reason,
      message,
      action: "ADJUST_PLAN",
    },
    timestamp: new Date().toISOString(),
  });
}
