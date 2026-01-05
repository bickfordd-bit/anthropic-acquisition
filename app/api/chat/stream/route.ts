import { appendLedger } from "@/lib/ledger";
import { routeIntent } from "@/lib/routeIntent";
import { gateIntent } from "@/lib/permissions";
import { getCanonSnapshot } from "@/lib/canon";
import { chatGPT } from "@/lib/engines/chatgpt";
import { claude } from "@/lib/engines/claude";
import { copilot } from "@/lib/engines/copilot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const encoder = new TextEncoder();

  const { engine, message, session } = await req.json();
  const text = String(message ?? "");
  const eng = String(engine ?? "");

  const { branch } = routeIntent(text);

  try {
    gateIntent(eng, text);
  } catch (e) {
    return new Response(String((e as Error).message ?? "Denied"), { status: 403 });
  }

  await appendLedger({ type: "intent", engine: eng, branch, message: text, session });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        // canon-aware (read-only injection)
        const canon = await getCanonSnapshot();
        void canon; // currently not injected into non-stream endpoints

        let reply = "";
        if (eng === "chatgpt-5.2") reply = await chatGPT(text);
        else if (eng === "claude") reply = await claude(text);
        else reply = await copilot(text);

        // token-ish streaming
        for (const token of reply.split(/(\s+)/)) {
          send({ token });
          await new Promise((r) => setTimeout(r, 15));
        }

        await appendLedger({ type: "action", engine: eng, branch, reply, session });
        send("[DONE]");
      } catch (e) {
        send({ error: String((e as Error).message ?? e) });
      } finally {
        controller.close();
      }
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
