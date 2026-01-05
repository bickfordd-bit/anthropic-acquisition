import type { AuthorizationDecision, Intent } from "@bickford/types";

import { authorize as authorizeCanon } from "@bickford/authority";
import { ledger } from "@bickford/ledger";

import { executeWithBickford } from "./src/claudeAdapter";

export type ClaudeToolWrapperOptions = {
  canonRules?: string[];
  model?: string;
  customerId?: string;
  actor?: string;
  origin?: string;
};

export type ClaudeToolWrapperExecuteRequest = {
  name: string;
  input: unknown;
  conversationId?: string;
  customerId?: string;
  actor?: string;
  origin?: string;
  model?: string;
  ttvImpact?: Record<string, number>;
};

export type ClaudeToolWrapperExecuteResult = {
  allowed: boolean;
  ledgerHash: string;
  reason?: string;
};

function deny(canon: string, rationale: string): AuthorizationDecision {
  return {
    allowed: false,
    decision: "DENY",
    canon,
    rationale,
  };
}

function allow(canon = "ALLOW", rationale = "ok"): AuthorizationDecision {
  return {
    allowed: true,
    decision: "ALLOW",
    canon,
    rationale,
  };
}

function evaluateFinancialCompliance(intent: Intent): AuthorizationDecision | null {
  if (intent.action !== "transfer_funds") return null;

  const input = (intent.params as any)?.input as any;
  const amount = typeof input?.amount === "number" ? input.amount : Number.NaN;
  const recipient = typeof input?.recipient === "string" ? input.recipient : "";

  if (!Number.isFinite(amount)) {
    return deny("FIN-000", "Invalid transfer request: missing amount");
  }

  // Demo threshold: keep this small and explicit.
  if (amount > 10_000) {
    return deny("FIN-001", "Transfer denied: amount exceeds policy threshold");
  }

  if (!recipient.startsWith("acct-")) {
    return deny("FIN-002", "Transfer denied: recipient not on allowlist");
  }

  return allow("FIN-ALLOW", "Transfer allowed under financial-compliance");
}

function evaluateCanonRules(intent: Intent, canonRules: string[] | undefined): AuthorizationDecision | null {
  const rules = canonRules ?? [];
  if (rules.includes("financial-compliance")) {
    const fin = evaluateFinancialCompliance(intent);
    if (fin && !fin.allowed) return fin;
  }

  return null;
}

export class ClaudeToolWrapper {
  private readonly canonRules: string[];
  private readonly defaults: Pick<ClaudeToolWrapperOptions, "model" | "customerId" | "actor" | "origin">;

  constructor(options: ClaudeToolWrapperOptions = {}) {
    this.canonRules = options.canonRules ?? [];
    this.defaults = {
      model: options.model ?? "claude",
      customerId: options.customerId,
      actor: options.actor ?? "claude",
      origin: options.origin ?? "claude",
    };
  }

  async execute(req: ClaudeToolWrapperExecuteRequest): Promise<ClaudeToolWrapperExecuteResult> {
    const model = req.model ?? this.defaults.model ?? "claude";
    const customerId = req.customerId ?? this.defaults.customerId;
    const actor = req.actor ?? this.defaults.actor ?? "claude";
    const origin = req.origin ?? this.defaults.origin ?? "claude";

    const gate = await executeWithBickford(
      {
        model,
        toolName: req.name,
        toolInput: req.input,
        conversationId: req.conversationId,
        customerId,
        actor,
        origin,
        ttvImpact: req.ttvImpact ?? {},
      },
      {
        authorize: async (intent) => {
          const extra = evaluateCanonRules(intent, this.canonRules);
          if (extra) return extra;
          return authorizeCanon(intent);
        },
        ledgerAppend: async (intent, decision, meta = {}) => {
          const entry = await ledger.append(intent, decision, {
            ...meta,
            api: "toolWrapper",
            surface: "tool-wrapper",
            canonRules: this.canonRules,
          });
          return { hash: entry.hash };
        },
      },
    );

    return {
      allowed: gate.allowed,
      ledgerHash: gate.ledgerHash,
      reason: gate.allowed ? undefined : gate.rationale,
    };
  }
}
