export type ClaudeExecutionRequest = {
  model: string;
  toolName: string;
  toolInput: unknown;
  conversationId?: string;
  customerId?: string;
  actor?: string;
  origin?: string;
  ttvImpact?: Record<string, number>;
};

export type ClaudeExecutionResult = {
  allowed: boolean;
  rationale: string;
  ledgerHash: string;
  canon?: string;
  decision?: "ALLOW" | "DENY";
};

