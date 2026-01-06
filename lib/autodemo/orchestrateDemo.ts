import type { LedgerEvent } from "@/lib/ledger/types";
import { appendLedgerEvent } from "@/lib/ledger/write";
import { renderDemoScript } from "@/lib/autodemo/renderScript";
import { recordDemo } from "@/lib/autodemo/record";
import { publishDemo } from "@/lib/autodemo/publish";

export async function orchestrateDemo(event: LedgerEvent) {
  const transcript = renderDemoScript(event);

  try {
    const videoPath = await recordDemo(transcript, { executionId: event.executionId });
    const published = await publishDemo({
      videoPath,
      transcript,
      executionId: event.executionId,
      type: event.type,
    });

    appendLedgerEvent({
      id: crypto.randomUUID(),
      executionId: event.executionId,
      type: "DEMO_PUBLISHED",
      summary: "Autonomous demo published",
      details: {
        sourceEventType: event.type,
        sourceEventId: event.id,
        publicPath: published.publicPath,
        url: published.url,
      },
      timestamp: new Date().toISOString(),
    });

    return published.url;
  } catch (err: any) {
    appendLedgerEvent({
      id: crypto.randomUUID(),
      executionId: event.executionId,
      type: "DEMO_RECORDING_FAILED",
      summary: "Autonomous demo failed",
      details: {
        sourceEventType: event.type,
        sourceEventId: event.id,
        error: err?.message ? String(err.message) : String(err),
      },
      timestamp: new Date().toISOString(),
    });

    throw err;
  }
}
