// app/api/bickford/ledger/route.ts
import { NextResponse } from "next/server";
import { read } from "@/lib/bickford/ledger";

export const runtime = "nodejs";

export async function GET() {
  try {
    const entries = read();
    return NextResponse.json({ entries });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
