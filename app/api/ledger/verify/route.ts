import { verifyLedgerChain } from "@/lib/ledger";
import { enforceApiAuth, enforceRateLimit } from "@/lib/apiSecurity";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = enforceApiAuth(req);
  if (auth) return auth;

  const limited = enforceRateLimit(req, { keyPrefix: "ledger:verify", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  const url = new URL(req.url);
  const takeParam = url.searchParams.get("take");
  const take = Math.max(1, Math.min(10_000, Number(takeParam ?? 5000) || 5000));

  const result = await verifyLedgerChain(take);
  return Response.json(result, { status: result.ok ? 200 : 409 });
}
