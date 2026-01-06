import type { LedgerEvent } from "@/lib/ledger/types";

export function shouldRecordDemo(event: LedgerEvent): boolean {
  if (!event || typeof event !== "object") return false;

  if (event.type === "CANON_DENIAL") return true;

  // For successful executions, we treat a DEPLOY_COMPLETE with a URL and no error as success.
  if (event.type === "DEPLOY_COMPLETE") {
    const details = (event.details ?? {}) as Record<string, unknown>;
    const url = typeof details.url === "string" ? details.url.trim() : "";
    const err = typeof details.error === "string" ? details.error.trim() : "";
    if (url && !err) return true;
  }

  return false;
}
