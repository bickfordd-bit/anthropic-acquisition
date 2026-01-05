// app/api/bickford/ledger/route.ts
import { NextResponse } from "next/server";
import { readAllLedgerEvents } from "@/lib/ledger/read";
import { enforceApiAuth, enforceRateLimit, safeErrorMessage } from "@/lib/apiSecurity";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const auth = enforceApiAuth(req);
    if (auth) return auth;

    const limited = enforceRateLimit(req, { keyPrefix: "bickford:ledger", limit: 30, windowMs: 60_000 });
    if (limited) return limited;

    const entries = readAllLedgerEvents();
    return NextResponse.json({ entries });
  } catch (error: any) {
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 500 });
  }
}

