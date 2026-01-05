// lib/bickford/ledger.ts
import fs from "fs";

const LEDGER = "bickford-ledger.jsonl";

export function record(entry: any) {
  fs.appendFileSync(
    LEDGER,
    JSON.stringify({ ...entry, ts: new Date().toISOString() }) + "\n"
  );
}

export function read() {
  if (!fs.existsSync(LEDGER)) return [];
  return fs.readFileSync(LEDGER, "utf-8").trim().split("\n").map(JSON.parse);
}
