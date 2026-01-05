import Anthropic from "@anthropic-ai/sdk";

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

export async function claude(prompt: string) {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Missing ANTHROPIC_API_KEY");

  const model = process.env.ANTHROPIC_CHAT_MODEL ?? "claude-3-5-sonnet-latest";
  const message = await anthropic.messages.create({
    model,
    max_tokens: 512,
    temperature: 0.2,
    messages: [{ role: "user", content: prompt }],
  });

  return extractText(message.content as any);
}
