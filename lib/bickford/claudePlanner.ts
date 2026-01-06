import Anthropic from "@anthropic-ai/sdk";
import { routeModelRequest } from "@/lib/engines/router";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function extractText(content: unknown): string {
  const blocks = Array.isArray(content) ? content : [];
  return blocks
    .filter((b: any) => b?.type === "text" && typeof b?.text === "string")
    .map((b: any) => String(b.text))
    .join("\n")
    .trim();
}

export async function claudeProposePlan(intent: string) {
  // Demo mode: deterministic, offline, and safe.
  if (process.env.DEMO_MODE === "true") {
    return {
      summary: `DEMO PLAN (no-op): ${String(intent).slice(0, 140)}`,
      files: [],
    };
  }

  const planPrompt = `
You are assisting a system called Bickford.
Your task:
- Propose a deterministic execution plan
- Do NOT execute anything
- Output ONLY valid JSON
- Use this schema exactly:
{
  "summary": string,
  "files": [
    {
      "path": string,
      "content": string
    }
  ]
}

Intent:
${intent}
  `.trim();

  // Use router with planning task type for optimal model selection
  try {
    const response = await routeModelRequest(planPrompt, "planning", {
      maxTokens: 800,
      temperature: 0,
    });

    const text = response.text;
    if (!text) throw new Error("Router returned empty plan");

    try {
      return JSON.parse(text);
    } catch (e) {
      const err = e as Error;
      throw new Error(`Router returned non-JSON output: ${err.message}`);
    }
  } catch (routerError) {
    // Fallback to direct Anthropic call if router fails
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("Missing ANTHROPIC_API_KEY");
    }

    const msg = await anthropic.messages.create({
      model: process.env.ANTHROPIC_PLAN_MODEL ?? "claude-3-5-sonnet-20241022",
      max_tokens: 800,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: planPrompt,
        },
      ],
    });

    const text = extractText((msg as any).content);
    if (!text) throw new Error("Claude returned empty plan");

    try {
      return JSON.parse(text);
    } catch (e) {
      const err = e as Error;
      throw new Error(`Claude returned non-JSON output: ${err.message}`);
    }
  }
}

