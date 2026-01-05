import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // initial replay: last 50
      const initial = await prisma.ledgerEntry.findMany({
        take: 50,
        orderBy: { createdAt: "asc" },
      });

      for (const entry of initial) {
        send({ ...entry, content: JSON.parse(entry.content) });
      }

      let lastTimestamp =
        initial.length > 0 ? new Date(initial[initial.length - 1].createdAt) : new Date(0);

      // poll loop
      while (true) {
        const entries = await prisma.ledgerEntry.findMany({
          where: { createdAt: { gt: lastTimestamp } },
          orderBy: { createdAt: "asc" },
        });

        for (const entry of entries) {
          send({ ...entry, content: JSON.parse(entry.content) });
          lastTimestamp = new Date(entry.createdAt);
        }

        await new Promise((r) => setTimeout(r, 500));
      }
    },
    cancel() {
      // no-op (poll loop exits when controller is GC'd)
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
