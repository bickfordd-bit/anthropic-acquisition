export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { randomUUID } from "node:crypto";
import { BickfordWebUIIntegration } from "@/templates/bickford-autonomous-env/web-ui-integration";
import type { BickfordIntent } from "@/templates/bickford-autonomous-env/intent-processor";

type RequestBody = {
  prompt?: unknown;
  userId?: unknown;
  metadata?: unknown;
  mode?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;

    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return Response.json({ error: "Prompt is required" }, { status: 400 });
    }

    const userId = typeof body.userId === "string" && body.userId.trim().length > 0 ? body.userId.trim() : "anonymous";

    const mode = body.mode === "execute" ? "execute" : "plan";

    // Hard gate server-side execution.
    if (mode === "execute" && process.env.BICKFORD_AUTONOMOUS_EXECUTE !== "true") {
      return Response.json(
        {
          error: "Execution is disabled on this server",
          hint: "Set BICKFORD_AUTONOMOUS_EXECUTE=true to allow execute mode",
        },
        { status: 403 },
      );
    }

    const metadata = isRecord(body.metadata) ? (body.metadata as Record<string, unknown>) : undefined;

    const intent: BickfordIntent = {
      id: randomUUID(),
      userId,
      prompt,
      timestamp: new Date().toISOString(),
      metadata: metadata as BickfordIntent["metadata"],
    };

    const integration = new BickfordWebUIIntegration();
    const result = await integration.processIntentFromUI(intent, { mode });

    if (!result.success) {
      return Response.json(
        {
          success: false,
          intentId: intent.id,
          error: result.error ?? "Unknown error",
        },
        { status: 500 },
      );
    }

    return Response.json({
      success: true,
      intentId: intent.id,
      mode,
      environmentPath: result.envPath,
      deploymentUrl: result.deploymentUrl,
      spec: result.spec,
      actions: result.actions,
      message: mode === "execute" ? "Environment created" : "Plan created",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: "Failed to create environment", detail: message }, { status: 500 });
  }
}
