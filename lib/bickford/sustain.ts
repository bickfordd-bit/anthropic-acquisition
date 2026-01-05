// lib/bickford/sustain.ts
import { read, LedgerEntry } from "./ledger";

export function identifyImprovements(): LedgerEntry[] {
  const ledger = read();
  return ledger.filter((e: LedgerEntry) => e.type === "failure");
}
