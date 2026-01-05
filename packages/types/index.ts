export type Intent = {
  action: string;
  params: Record<string, unknown>;
  origin: string;
  timestamp: string;
};

export type AuthorizationDecision = {
  allowed: boolean;
  decision: "ALLOW" | "DENY";
  canon: string;
  rationale: string;
};
