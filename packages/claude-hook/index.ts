export { executeWithBickford, executeWithBickfordOrThrow } from "./src/index";
export * from "./src/types";

import { executeWithBickford } from "./src/claudeAdapter";

// Back-compat helper kept for existing callers.
export async function bickfordExecuteFromClaude(params: {
  claudeOutput: string;
  toolName: string;
  context?: Record<string, any>;
}) {
  const gate = await executeWithBickford({
    model: "claude",
    toolName: params.toolName,
    toolInput: params.claudeOutput,
  });

  if (!gate.allowed) {
    return {
      allowed: false as const,
      rationale: gate.rationale,
      ledgerHash: gate.ledgerHash,
    };
  }

  return {
    allowed: true as const,
    execute: true as const,
    ledgerHash: gate.ledgerHash,
  };
}
