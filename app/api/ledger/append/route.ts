import { appendLedger } from "@/lib/ledger";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json();

  const entry = await appendLedger(body);
  return Response.json({
    ...entry,
    content: JSON.parse(entry.content),
  });
}
