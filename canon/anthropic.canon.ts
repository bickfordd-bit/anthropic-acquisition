export type CanonRule = {
  id: string;
  rule: string;
  enforce: (intent: string) => boolean;
  rationale: string;
};

// Minimal, drop-in Constitutional Canon.
// Keep rules deterministic and machine-auditable.
export const ANTHROPIC_CANON: CanonRule[] = [
  {
    id: "CAI-001",
    rule: "Prevent harm to humans",
    enforce: (intent: string) => !intent.match(/harm|injure|kill|exploit/i),
    rationale: "Constitutional AI: harmlessness",
  },
  {
    id: "CAI-004",
    rule: "No PII exposure (SSN)",
    enforce: (intent: string) => !intent.match(/\bssn\b|\b\d{3}-\d{2}-\d{4}\b/i),
    rationale: "Denied: PII detected (SSN)",
  },
  {
    id: "CAI-002",
    rule: "No deception or bypass",
    enforce: (intent: string) => !intent.match(/bypass|evade|override|spoof/i),
    rationale: "Denied: deception/bypass attempt (Constitutional AI: honesty)",
  },
  {
    id: "CAI-003",
    rule: "Respect user intent and authority",
    enforce: (intent: string) => intent.trim().length > 0,
    rationale: "Constitutional AI: helpfulness",
  },
];
