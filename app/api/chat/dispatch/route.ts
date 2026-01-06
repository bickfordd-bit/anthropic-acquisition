import { appendLedger } from "@/lib/ledger";
import { routeIntent } from "@/lib/routeIntent";
import { gateIntent } from "@/lib/permissions";
import { routeModelRequest } from "@/lib/engines/router";
import type { TaskType } from "@/lib/engines/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { engine, message, session, taskType, model } = await req.json();

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
  let actualModel = engine;
  let usage;

  // Use router for intelligent model selection if taskType is provided
  if (taskType || model) {
    try {
      const response = await routeModelRequest(
        message,
        (taskType as TaskType) || "chat",
        { model }
      );
      reply = response.text;
      actualModel = response.model;
      usage = response.usage;
    } catch (error) {
      // Fallback to legacy engine selection
      const { chatGPT } = await import("@/lib/engines/chatgpt");
      const { claude } = await import("@/lib/engines/claude");
      const { copilot } = await import("@/lib/engines/copilot");

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
    }
  } else {
    // Legacy engine-based routing
    const { chatGPT } = await import("@/lib/engines/chatgpt");
    const { claude } = await import("@/lib/engines/claude");
    const { copilot } = await import("@/lib/engines/copilot");

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
  }

  await appendLedger({
    type: "action",
    engine: actualModel,
    branch,
    reply,
    session,
  });

  return Response.json({ 
    reply, 
    model: actualModel,
    usage 
  });
}

