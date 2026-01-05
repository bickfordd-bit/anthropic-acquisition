// lib/bickford/ledger.ts
import fs from "fs";

const LEDGER = "bickford-ledger.jsonl";

export interface LedgerEntry {
  type: string;
  ts?: string;
  [key: string]: unknown;
}

export function record(entry: LedgerEntry) {
  fs.appendFileSync(
    LEDGER,
    JSON.stringify({ ...entry, ts: new Date().toISOString() }) + "\n"
  );
}

export function read(): LedgerEntry[] {
  if (!fs.existsSync(LEDGER)) return [];
  const content = fs.readFileSync(LEDGER, "utf-8").trim();
  if (!content) return [];
  return content.split("\n").map((line) => JSON.parse(line) as LedgerEntry);
}
