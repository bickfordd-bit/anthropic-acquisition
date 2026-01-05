// lib/ledger/write.ts

import fs from "fs";
import path from "path";
import { LedgerEvent } from "./types";

const LEDGER_PATH = path.join(process.cwd(), "ledger", "ledger.jsonl");

/**
 * Ensures the ledger directory exists
 */
function ensureLedgerDirectory() {
  const ledgerDir = path.dirname(LEDGER_PATH);
  if (!fs.existsSync(ledgerDir)) {
    fs.mkdirSync(ledgerDir, { recursive: true });
  }
}

/**
 * Appends an event to the ledger in JSONL format
 * @param event - The event to append
 */
export function appendToLedger(event: LedgerEvent) {
  ensureLedgerDirectory();
  
  const eventWithTimestamp = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  };
  
  const line = JSON.stringify(eventWithTimestamp) + "\n";
  fs.appendFileSync(LEDGER_PATH, line, "utf-8");
}

/**
 * Reads all events from the ledger
 * @returns Array of ledger events
 */
export function readLedger(): LedgerEvent[] {
  if (!fs.existsSync(LEDGER_PATH)) {
    return [];
  }
  
  const content = fs.readFileSync(LEDGER_PATH, "utf-8").trim();
  if (!content) {
    return [];
  }
  
  return content.split("\n").map((line) => JSON.parse(line) as LedgerEvent);
}

/**
 * Reads events for a specific execution
 * @param executionId - The execution ID to filter by
 * @returns Array of events for that execution
 */
export function readExecutionEvents(executionId: string): LedgerEvent[] {
  const allEvents = readLedger();
  return allEvents.filter((event) => event.executionId === executionId);
}

/**
 * Gets the ledger file path
 * @returns The absolute path to the ledger file
 */
export function getLedgerPath(): string {
  return LEDGER_PATH;
}
