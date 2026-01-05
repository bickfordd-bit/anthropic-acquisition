// lib/bickford/claudePlanner.ts

import Anthropic from "@anthropic-ai/sdk";

export interface ClaudePlan {
  summary: string;
  files: Array<{ path: string; content: string }>;
  requiresDeploy: boolean;
}

/**
 * Uses Claude 3.5 Sonnet to generate execution plans from intent
 * Does NOT execute - only proposes deterministic JSON structure
 * @param intent - Natural language intent
 * @returns Structured execution plan
 */
export async function generatePlanFromIntent(intent: string): Promise<ClaudePlan> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required for Claude planning");
  }

  const anthropic = new Anthropic({ apiKey });

  const systemPrompt = `You are a code planning assistant for the Bickford autonomous execution system.

Your role is to PROPOSE plans, not execute them. Generate a structured JSON plan from user intent.

Return ONLY valid JSON in this exact format:
{
  "summary": "Brief description of what will be done",
  "files": [
    {
      "path": "relative/path/to/file.ext",
      "content": "Full file content here"
    }
  ],
  "requiresDeploy": true/false
}

Rules:
- Use relative paths from project root
- Include complete file content
- Set requiresDeploy to true for user-facing changes
- Keep changes minimal and focused
- Never modify ledger files directly
- Never modify node_modules`;

  const response = await anthropic.messages.create({
    model: process.env.ANTHROPIC_INTENT_MODEL || "claude-3-5-sonnet-latest",
    max_tokens: 4000,
    temperature: 0,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: intent,
      },
    ],
  });

  // Extract text from response
  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude did not return text content");
  }

  const text = textBlock.text.trim();

  // Parse JSON response
  let plan: ClaudePlan;
  try {
    // Try to extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;
    plan = JSON.parse(jsonText);
  } catch (error) {
    throw new Error(`Failed to parse Claude response as JSON: ${text.substring(0, 200)}`);
  }

  // Validate plan structure
  if (!plan.summary || !Array.isArray(plan.files) || typeof plan.requiresDeploy !== "boolean") {
    throw new Error("Invalid plan structure from Claude");
  }

  return plan;
}
