// lib/engines/withBickfordContext.ts
import { getBickfordContext } from "@/lib/bickfordContext";

export function withBickfordContext(userPrompt: string) {
  const ctx = getBickfordContext();

  return `
BICKFORD CANON (IMMUTABLE):
${JSON.stringify(ctx, null, 2)}

USER PROMPT:
${userPrompt}
`;
}
