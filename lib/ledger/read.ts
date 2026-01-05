import fs from "fs";
import path from "path";
import type { LedgerEvent } from "./types";

const LEDGER_PATH = path.resolve("ledger/ledger.jsonl");

function safeParse(line: string): LedgerEvent | null {
  try {
    const obj = JSON.parse(line) as LedgerEvent;
    if (!obj || typeof obj !== "object") return null;
    if (typeof obj.id !== "string") return null;
    if (typeof obj.executionId !== "string") return null;
    if (typeof obj.type !== "string") return null;
    if (typeof obj.summary !== "string") return null;
    if (typeof obj.timestamp !== "string") return null;
    return obj;
  } catch {
    return null;
  }
}

export function readAllLedgerEvents(): LedgerEvent[] {
  const filePath = path.resolve(LEDGER_PATH);
  if (!fs.existsSync(filePath)) return [];

  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);

  const events: LedgerEvent[] = [];
  for (const line of lines) {
    const parsed = safeParse(line);
    if (parsed) events.push(parsed);
  }

  events.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  return events;
}

export function readLedgerEventsByExecutionId(executionId: string): LedgerEvent[] {
  return readAllLedgerEvents().filter((e) => e.executionId === executionId);
}
