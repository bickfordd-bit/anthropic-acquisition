import { readLedgerEventsByExecutionId } from "@/lib/ledger/read";
import { enforceApiAuth, enforceRateLimit } from "@/lib/apiSecurity";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ executionId: string }> },
) {
  const auth = enforceApiAuth(req);
  if (auth) return auth;

  const limited = enforceRateLimit(req, { keyPrefix: "bickford:ledgerByExecution", limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  const { executionId } = await ctx.params;
  const id = String(executionId ?? "").trim();
  if (!id) return Response.json({ error: "Missing executionId" }, { status: 400 });

  const events = readLedgerEventsByExecutionId(id);
  return Response.json(events);
}
