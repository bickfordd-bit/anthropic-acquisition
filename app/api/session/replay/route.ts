import { prisma } from "@/lib/prisma";
import { enforceApiAuth, enforceRateLimit } from "@/lib/apiSecurity";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = enforceApiAuth(req);
  if (auth) return auth;

  const limited = enforceRateLimit(req, { keyPrefix: "session:replay", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const url = new URL(req.url);
  const session = url.searchParams.get("session");
  if (!session) return new Response("Missing session", { status: 400 });

  // Prevent unbounded full-ledger scans on the replay path.
  const entries = await prisma.ledgerEntry.findMany({
    take: 5000,
    orderBy: { createdAt: "desc" },
  });

  const filtered = entries
    .reverse()
    .map((e) => {
      try {
        return { ...e, content: JSON.parse(e.content) };
      } catch {
        return { ...e, content: e.content };
      }
    })
    .filter((e) => (e.content as any)?.session === session);

  return Response.json(filtered);
}
