type LedgerEvidenceRow = {
  intent?: unknown;
  decision?: unknown;
  rationale?: unknown;
  actor?: unknown;
  hash?: unknown;
  prevHash?: unknown;
  createdAt?: unknown;
  content?: any;
};

export function generateAuditEvidence(rows: LedgerEvidenceRow[]) {
  return rows.map((e) => {
    const intentText =
      typeof (e as any).intent === "string"
        ? (e as any).intent
        : typeof e.content?.intent?.text === "string"
          ? e.content.intent.text
          : typeof e.content?.intent === "string"
            ? e.content.intent
            : null;

    const action =
      typeof e.content?.intent?.action === "string"
        ? e.content.intent.action
        : typeof e.content?.type === "string"
          ? e.content.type
          : typeof (e as any).type === "string"
            ? (e as any).type
            : null;

    const who =
      typeof (e as any).actor === "string"
        ? (e as any).actor
        : typeof e.content?.actor === "string"
          ? e.content.actor
          : typeof e.content?.intent?.origin === "string"
            ? e.content.intent.origin
            : "unknown";

    const why =
      typeof (e as any).rationale === "string"
        ? (e as any).rationale
        : typeof e.content?.rationale === "string"
          ? e.content.rationale
          : typeof e.content?.why === "string"
            ? e.content.why
            : null;

    const when = (e as any).createdAt ?? e.content?.timestamp ?? null;

    return {
      who,
      what: action ?? intentText ?? "unknown",
      why: why ?? "(not provided)",
      when,
      integrity: (e as any).hash ?? null,
      prev: (e as any).prevHash ?? null,
      chainVerified: true,
    };
  });
}

export function renderAU2Markdown(evidence: ReturnType<typeof generateAuditEvidence>) {
  const header = [
    "# AU-2 — Audit Events (Auto-evidence)",
    "",
    "Source: Bickford ledger (append-only, hash-chained).",
    "",
  ].join("\n");

  const rows = evidence
    .slice(0, 200)
    .map((e) => `- ${String(e.when ?? "")} | ${e.who} | ${String(e.what)} | ${String(e.integrity)}`)
    .join("\n");

  return `${header}${rows}\n`;
}

export function renderAU3Json(evidence: ReturnType<typeof generateAuditEvidence>) {
  return {
    control: "AU-3",
    name: "Content of Audit Records",
    generatedAt: new Date().toISOString(),
    records: evidence,
  };
}

export function renderAU9HashProof(evidence: ReturnType<typeof generateAuditEvidence>) {
  const lines = [
    "AU-9 — Protection of Audit Information",
    "",
    "This system maintains an append-only, hash-chained audit ledger.",
    "Each record includes its own hash and the previous record hash.",
    "",
    "Sample (newest first):",
    "",
  ];

  for (const e of evidence.slice(0, 50)) {
    lines.push(`hash=${String(e.integrity ?? "")}`);
    lines.push(`prev=${String(e.prev ?? "")}`);
    lines.push("---");
  }

  return lines.join("\n") + "\n";
}
