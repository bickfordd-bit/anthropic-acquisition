import { executeWithBickford } from "@bickford/claude-hook";
import type { AuthorizationDecision, Intent } from "@bickford/types";

export type ClaudeToolCall = {
  toolName: string;
  toolInput: unknown;
  // Optional identifiers if you have them
  conversationId?: string;
  customerId?: string;
  actor?: string;
  origin?: string;
  // Optional multi-agent non-interference signal
  ttvImpact?: Record<string, number>;
};

export type ClaudeToolResult =
  | {
      ok: true;
      proof: { ledgerHash: string };
      result: unknown;
    }
  | {
      ok: false;
      proof: { ledgerHash: string };
      rationale: string;
    };

type ToolHandler = (input: unknown) => Promise<unknown>;

export type RouterDeps = {
  authorize: (intent: Intent) => AuthorizationDecision | Promise<AuthorizationDecision>;
  ledgerAppend: (
    intent: Intent,
    decision: AuthorizationDecision,
    meta?: Record<string, unknown>,
  ) => Promise<{ hash: string }>;
  tools: Record<string, ToolHandler>;
};

/**
 * Paste this into your Claude tool-call handler.
 *
 * Flow:
 * 1) intent -> authorize + NI
 * 2) always append ledger
 * 3) if allowed, execute tool
 */
export async function routeClaudeToolCall(call: ClaudeToolCall, deps: RouterDeps): Promise<ClaudeToolResult> {
  const tool = deps.tools[call.toolName];
  if (!tool) {
    // Unknown tool: still ledger a denial for audit completeness.
    const gate = await executeWithBickford(
      {
        model: "claude",
        toolName: call.toolName,
        toolInput: call.toolInput,
        conversationId: call.conversationId,
        customerId: call.customerId,
        actor: call.actor ?? "claude",
        origin: call.origin ?? "claude",
        ttvImpact: call.ttvImpact ?? {},
      },
      {
        authorize: async (intent) => ({
          allowed: false,
          decision: "DENY",
          canon: "TOOL-404",
          rationale: `Unknown tool: ${intent.action}`,
        }),
        ledgerAppend: deps.ledgerAppend,
      },
    );

    return { ok: false, proof: { ledgerHash: gate.ledgerHash }, rationale: gate.rationale };
  }

  const gate = await executeWithBickford(
    {
      model: "claude",
      toolName: call.toolName,
      toolInput: call.toolInput,
      conversationId: call.conversationId,
      customerId: call.customerId,
      actor: call.actor ?? "claude",
      origin: call.origin ?? "claude",
      ttvImpact: call.ttvImpact ?? {},
    },
    {
      authorize: deps.authorize,
      ledgerAppend: deps.ledgerAppend,
    },
  );

  if (!gate.allowed) {
    return { ok: false, proof: { ledgerHash: gate.ledgerHash }, rationale: gate.rationale };
  }

  const result = await tool(call.toolInput);
  return { ok: true, proof: { ledgerHash: gate.ledgerHash }, result };
}

// --- Example wiring (replace with your real implementations) ---

async function deployService(_input: unknown) {
  return { deployed: true };
}

async function sendEmail(_input: unknown) {
  return { sent: true };
}

export function exampleDeps(): RouterDeps {
  return {
    authorize: async (_intent) => ({
      allowed: true,
      decision: "ALLOW",
      canon: "ALLOW",
      rationale: "ok",
    }),
    ledgerAppend: async (_intent, _decision, _meta) => ({
      hash: "your-ledger-hash",
    }),
    tools: {
      deploy_service: deployService,
      send_email: sendEmail,
    },
  };
}
