# @bickford/claude-hook

Drop-in execution gate for Claude tool calls.

## Usage

### Primary API (recommended)

```ts
import { executeWithBickford } from "@bickford/claude-hook";

const gate = await executeWithBickford({
  model: "claude-sonnet-4.5",
  toolName: "deploy_service",
  toolInput: { region: "us-east-1" },
  conversationId: "c_123",
  customerId: "acme-financial",
});

if (!gate.allowed) {
  return { error: "Execution denied", rationale: gate.rationale, proof: gate.ledgerHash };
}

// proceed with the actual tool execution
```

### Anthropic-side integration (dependency injection)

For a true zero-coupling embed, inject your own policy + ledger.

```ts
import { executeWithBickford } from "@bickford/claude-hook";

const gate = await executeWithBickford(
  {
    model: "claude-sonnet-4.5",
    toolName: "deploy_service",
    toolInput: { region: "us-east-1" },
    customerId: "acme-financial",
    actor: "claude",
    // optional: populated in multi-agent mode
    ttvImpact: { claude: -0.1, operator: 0 },
  },
  {
    authorize: async (intent) => {
      // call your own policy engine
      return { allowed: true, decision: "ALLOW", canon: "ALLOW", rationale: "ok" };
    },
    ledgerAppend: async (_intent, _decision, _meta) => {
      // write to your audit store, return integrity handle
      return { hash: "your-ledger-hash" };
    },
  },
);
```

### Paste-ready tool router

See the single-file tool-call router example: [examples/claude-tools-router.ts](examples/claude-tools-router.ts).

### Tool wrapper (third-party integrations)

```ts
import { ClaudeToolWrapper } from "@bickford/claude-hook/tool-wrapper";

const tool = new ClaudeToolWrapper({
  canonRules: ["financial-compliance"],
});

const result = await tool.execute({
  name: "transfer_funds",
  input: { amount: 100, recipient: "acct-123" },
});

if (result.allowed) {
  console.log("✅ Transfer authorized", result.ledgerHash);
} else {
  console.log("❌ Transfer denied", result.reason, result.ledgerHash);
}
```

Run the demo:

```bash
pnpm exec tsx scripts/demo-tool-wrapper.ts
```

### Back-compat helper

```ts
import { bickfordExecuteFromClaude } from "@bickford/claude-hook";

const decision = await bickfordExecuteFromClaude({
  claudeOutput: assistantText,
  toolName: "send_email",
  context: { userId: "u_123" },
});

if (!decision.allowed) {
  throw new Error(decision.rationale);
}

// proceed with the actual tool execution
```

This wraps *execution*, not reasoning.

## Migration guide: `bickfordExecuteFromClaude()` → `executeWithBickford()`

Before:

```ts
import { bickfordExecuteFromClaude } from "@bickford/claude-hook";

const decision = await bickfordExecuteFromClaude({
  claudeOutput: assistantText,
  toolName: "send_email",
});

if (!decision.allowed) throw new Error(decision.rationale);
```

After:

```ts
import { executeWithBickford } from "@bickford/claude-hook";

const gate = await executeWithBickford({
  model: "claude-sonnet-4.5",
  toolName: "send_email",
  toolInput: { to: "buyer@example.com", subject: "Update" },
});

if (!gate.allowed) throw new Error(gate.rationale);
console.log("Proof:", gate.ledgerHash);
```

Benefits:
- Explicit tool payload (`toolInput`) and identifiers (`conversationId`, `customerId`)
- Canon + non-interference enforced on the same gate
- Always returns `ledgerHash` as an integrity handle
