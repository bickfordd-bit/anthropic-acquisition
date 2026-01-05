import fs from "fs";
import path from "path";
import type { LedgerEvent } from "./types";

const LEDGER_PATH = path.resolve("ledger/ledger.jsonl");

export function appendLedgerEvent(event: LedgerEvent) {
  fs.mkdirSync(path.dirname(LEDGER_PATH), { recursive: true });
  fs.appendFileSync(LEDGER_PATH, JSON.stringify(event) + "\n");
}
