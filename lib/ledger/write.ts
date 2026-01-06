import fs from "fs";
import path from "path";
import type { LedgerEvent } from "./types";
import { shouldRecordDemo } from "@/lib/autodemo/shouldRecordDemo";

const LEDGER_PATH = path.resolve("ledger/ledger.jsonl");

function shouldAutorecord(): boolean {
  return (process.env.BICKFORD_DEMO_AUTORECORD ?? "").trim().toLowerCase() === "true";
}

function isDemoInternalEvent(event: LedgerEvent): boolean {
  return String(event.type ?? "").startsWith("DEMO_");
}

function queueAutodemo(event: LedgerEvent) {
  if (!shouldAutorecord()) return;
  if (isDemoInternalEvent(event)) return;
  if (!shouldRecordDemo(event)) return;

  // Fire-and-forget: do not block API responses.
  setTimeout(() => {
    void (async () => {
      const mod = await import("@/lib/autodemo/orchestrateDemo");
      await mod.orchestrateDemo(event);
    })().catch((err) => {
      // eslint-disable-next-line no-console
      console.warn("(warn) demo orchestration failed", err);

      try {
        appendLedgerEvent({
          id: crypto.randomUUID(),
          executionId: event.executionId,
          type: "DEMO_RECORDING_FAILED",
          summary: "Autonomous demo orchestration failed",
          details: {
            sourceEventType: event.type,
            sourceEventId: event.id,
            error: err?.message ? String(err.message) : String(err),
          },
          timestamp: new Date().toISOString(),
        });
      } catch {
        // If we can't write to the ledger, avoid throwing from a fire-and-forget path.
      }
    });
  }, 0);
}

export function appendLedgerEvent(event: LedgerEvent) {
  fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
  fs.appendFileSync(LEDGER_PATH, JSON.stringify(event) + "\n");

  queueAutodemo(event);
}
