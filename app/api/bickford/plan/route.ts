// app/api/bickford/plan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { planFromIntent } from "@/lib/bickford/planner";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { intent } = await req.json();
    
    if (!intent || typeof intent !== "string") {
      return NextResponse.json({ error: "Intent is required" }, { status: 400 });
    }
    
    const result = await planFromIntent(intent);
    
    return NextResponse.json({
      plan: result.plan,
      canonDecision: result.canonDecision,
      canonRationale: result.canonRationale,
      executionId: result.executionId,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
