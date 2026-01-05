// lib/bickford/sustain.ts
import { read } from "./ledger";

export function identifyImprovements() {
  const ledger = read();
  return ledger.filter((e: any) => e.type === "failure");
}
