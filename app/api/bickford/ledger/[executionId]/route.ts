// app/api/bickford/ledger/[executionId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { readExecutionEvents } from "@/lib/ledger/write";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ executionId: string }> }
) {
  try {
    const params = await context.params;
    const executionId = params.executionId;

    if (!executionId) {
      return NextResponse.json(
        { error: "executionId is required" },
        { status: 400 }
      );
    }

    // Get events for this execution
    const events = readExecutionEvents(executionId);

    // Sort chronologically
    events.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return NextResponse.json({
      executionId,
      eventCount: events.length,
      events,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
