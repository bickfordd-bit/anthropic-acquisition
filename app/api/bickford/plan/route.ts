// app/api/bickford/plan/route.ts
import { NextResponse } from "next/server";
import { planFromIntent } from "@/lib/bickford/planner";
import { enforceApiAuth, enforceRateLimit, readJson, safeErrorMessage } from "@/lib/apiSecurity";

export const runtime = "nodejs";

type PlanBody = {
  intent?: unknown;
};

export async function POST(req: Request) {
  try {
    const auth = enforceApiAuth(req);
    if (auth) return auth;

    const limited = enforceRateLimit(req, { keyPrefix: "bickford:plan", limit: 30, windowMs: 60_000 });
    if (limited) return limited;

    const parsed = await readJson<PlanBody>(req);
    if (!parsed.ok) return parsed.response;

    const intent = typeof parsed.value.intent === "string" ? parsed.value.intent.trim() : "";
    if (!intent) return NextResponse.json({ error: "Missing intent" }, { status: 400 });

    const executionId = crypto.randomUUID();
    const plan = await planFromIntent(intent, executionId);
    return NextResponse.json({ executionId, plan });
  } catch (error: any) {
    return NextResponse.json({ error: safeErrorMessage(error) }, { status: 400 });
  }
}
