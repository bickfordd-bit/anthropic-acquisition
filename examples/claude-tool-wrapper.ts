import { executeWithBickford } from "@bickford/claude-hook";

type ClaudeToolOutput = unknown;

async function deployService(_input: ClaudeToolOutput) {
  // Replace with your actual tool implementation.
  return { ok: true };
}

export async function safeToolExecution(claudeOutput: ClaudeToolOutput) {
  const gate = await executeWithBickford({
    model: "claude-sonnet-4.5",
    toolName: "deploy_service",
    toolInput: claudeOutput,
    customerId: "acme-financial",
    actor: "claude",
    ttvImpact: {},
  });

  if (!gate.allowed) {
    return {
      error: "Execution denied",
      rationale: gate.rationale,
      proof: gate.ledgerHash,
    } as const;
  }

  const result = await deployService(claudeOutput);
  return { result, proof: gate.ledgerHash } as const;
}
