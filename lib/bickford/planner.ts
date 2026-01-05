// lib/bickford/planner.ts
import { assertBickfordIdentity } from "@/lib/invariants/bickfordIdentity";
import { Plan } from "./applier";

export async function planFromIntent(intent: string): Promise<Plan> {
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
