// app/api/bickford/sustain/route.ts
import { NextResponse } from "next/server";
import { identifyImprovements } from "@/lib/bickford/sustain";

export const runtime = "nodejs";

export async function GET() {
  try {
    const improvements = identifyImprovements();
    return NextResponse.json({ improvements });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
