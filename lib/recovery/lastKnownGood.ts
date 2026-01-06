import fs from "fs";
import path from "path";

type LedgerEvent = {
  type?: unknown;
  summary?: unknown;
  details?: unknown;
  timestamp?: unknown;
};

const DEFAULT_LEDGER_PATH = path.resolve("ledger/ledger.jsonl");

function readJsonLines(filePath: string): unknown[] {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const events: unknown[] = [];
  for (const line of lines) {
    try {
      events.push(JSON.parse(line));
    } catch {
      // ignore malformed line
    }
  }
  return events;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readString(obj: Record<string, unknown>, key: string): string | undefined {
  const v = obj[key];
  return typeof v === "string" ? v : undefined;
}

/**
 * Returns the git commit SHA for the last known good (LKG) state.
 *
 * Truth source: the append-only Bickford event ledger in `ledger/ledger.jsonl`.
 *
 * LKG is defined as the most recent of:
 * - a successful deploy event with `details.commitSha`
 * - a rollback event with `details.revertedTo`
 */
export function getLastKnownGoodCommit(ledgerPath = DEFAULT_LEDGER_PATH): string {
  const events = readJsonLines(ledgerPath) as LedgerEvent[];

  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    const type = typeof e?.type === "string" ? e.type : "";
    const summary = typeof e?.summary === "string" ? e.summary : "";
    const details = isObject(e?.details) ? (e.details as Record<string, unknown>) : undefined;

    if (type === "ROLLBACK_EXECUTED" && details) {
      const revertedTo = readString(details, "revertedTo");
      if (revertedTo) return revertedTo;
    }

    if (type === "DEPLOY_COMPLETE" && details) {
      const commitSha = readString(details, "commitSha");
      if (commitSha && summary.toLowerCase().includes("succeed")) return commitSha;
    }
  }

  throw new Error("NO_LAST_KNOWN_GOOD_STATE");
}
