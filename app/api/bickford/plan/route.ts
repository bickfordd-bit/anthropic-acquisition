// app/api/bickford/plan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { planFromIntent } from "@/lib/bickford/planner";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { intent } = await req.json();
    const plan = await planFromIntent(intent);
    return NextResponse.json(plan);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
