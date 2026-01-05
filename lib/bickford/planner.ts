// lib/bickford/planner.ts
import { assertBickfordIdentity } from "@/lib/invariants/bickfordIdentity";

export async function planFromIntent(intent: string) {
  assertBickfordIdentity("Bickford");

  return {
    summary: `Apply intent: ${intent}`,
    files: [
      {
        path: "README.md",
        content: `# Bickford Update\n\nIntent:\n${intent}\n`,
      },
    ],
    requiresDeploy: true,
  };
}
