import { appendLedger } from "@/lib/ledger";
import { routeIntent } from "@/lib/routeIntent";
import { gateIntent } from "@/lib/permissions";
import { chatGPT } from "@/lib/engines/chatgpt";
import { claude } from "@/lib/engines/claude";
import { copilot } from "@/lib/engines/copilot";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { engine, message, session } = await req.json();

  const { branch } = routeIntent(String(message ?? ""));
  gateIntent(String(engine ?? ""), String(message ?? ""));

  await appendLedger({
    type: "intent",
    engine,
    branch,
    message,
    session,
  });

  let reply = "";
  switch (engine) {
    case "chatgpt-5.2":
      reply = await chatGPT(message);
      break;
    case "claude":
      reply = await claude(message);
      break;
    default:
      reply = await copilot(message);
  }

  await appendLedger({
    type: "action",
    engine,
    branch,
    reply,
    session,
  });

  return Response.json({ reply });
}
