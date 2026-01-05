import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const session = url.searchParams.get("session");
  if (!session) return new Response("Missing session", { status: 400 });

  const entries = await prisma.ledgerEntry.findMany({
    where: {
      // SQLite JSON path filtering is limited; do a broad scan by type and filter in JS if needed.
      // For small ledgers this is OK; for Postgres you can switch to json path queries.
    },
    orderBy: { createdAt: "asc" },
  });

  const filtered = entries
    .map((e) => ({ ...e, content: JSON.parse(e.content) }))
    .filter((e) => (e.content as any)?.session === session);

  return Response.json(filtered);
}
