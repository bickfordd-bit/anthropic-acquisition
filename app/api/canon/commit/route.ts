import { prisma } from "@/lib/prisma";
import { hashObject } from "@/lib/hash";
import { appendLedger } from "@/lib/ledger";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json();
  const ledgerHash = hashObject(body);

  const canon = await prisma.canonEntry.create({
    data: {
      title: body.title ?? "Untitled",
      content: JSON.stringify(body),
      ledgerHash,
    },
  });

  // ledger-first: canon promotion is recorded
  await appendLedger({ type: "canon", canonId: canon.id, ledgerHash, title: canon.title });

  return Response.json({
    ...canon,
    content: JSON.parse(canon.content),
  });
}
