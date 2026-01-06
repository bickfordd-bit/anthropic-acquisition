/**
 * Direct ChatGPT API call (legacy interface)
 * For new code, prefer using the router from lib/engines/router.ts
 */
export async function chatGPT(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const model = process.env.OPENAI_CHAT_MODEL ?? "gpt-4-turbo-preview";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI error: ${res.status} ${text}`);
  }

  const data = (await res.json()) as any;
  return data.choices?.[0]?.message?.content ?? "";
}

