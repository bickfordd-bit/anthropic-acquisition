import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";
import { routeModelRequest } from "@/lib/engines/router";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function extractText(content: Array<{ type: string; text?: string }>): string {
  return content
    .filter((b) => b?.type === "text" && typeof b.text === "string")
    .map((b) => b.text)
    .join("\n")
    .trim();
}

/**
 * Generate intent with provenance using multi-model router
 * Prefers Claude for reasoning but falls back to GPT if needed
 */
export async function generateIntentWithProvenance(prompt: string) {
  // Use router for better model selection and fallback
  try {
    const response = await routeModelRequest(prompt, "intent", {
      maxTokens: 300,
      temperature: 0,
    });

    const hash = crypto.createHash("sha256").update(response.text).digest("hex");

    return {
      text: response.text,
      hash,
      model: response.model,
      id: undefined, // Router doesn't provide message IDs yet
      usage: response.usage,
    };
  } catch (routerError) {
    // Fallback to direct Anthropic call if router fails
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("Missing ANTHROPIC_API_KEY");
    }

    const model =
      process.env.ANTHROPIC_INTENT_MODEL ?? "claude-3-5-sonnet-latest";

    const message = await anthropic.messages.create({
      model,
      max_tokens: 300,
      temperature: 0,
      system:
        "You are a reasoning engine. You do NOT execute actions. You propose intent clearly and concisely.",
      messages: [{ role: "user", content: prompt }],
    });

    const text = extractText(message.content as any);
    if (!text) throw new Error("Anthropic returned empty intent");

    const hash = crypto.createHash("sha256").update(text).digest("hex");

    return {
      text,
      hash,
      model,
      id: (message as any).id as string | undefined,
    };
  }
}

export async function generateIntent(prompt: string) {
  const { text } = await generateIntentWithProvenance(prompt);
  return text;
}

