import { verifyLedgerChain } from "@/lib/ledger";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const takeParam = url.searchParams.get("take");
  const take = Math.max(1, Math.min(50_000, Number(takeParam ?? 5000) || 5000));

  const result = await verifyLedgerChain(take);
  return Response.json(result, { status: result.ok ? 200 : 409 });
}
