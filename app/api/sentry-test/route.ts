import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Test error capture
    throw new Error("Sentry Test Error - This is intentional for testing monitoring setup");
  } catch (error) {
    // Capture the error in Sentry
    Sentry.captureException(error);
    
    return NextResponse.json({
      success: true,
      message: "Test error sent to Sentry",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
