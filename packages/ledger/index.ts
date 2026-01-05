import { hashEntry, stableStringify } from "@/lib/hash";
import type { AuthorizationDecision, Intent } from "@bickford/types";

export type LedgerMeta = Record<string, unknown>;

export type LedgerEntry = {
  intent: Intent;
  decision: AuthorizationDecision;
  meta: LedgerMeta;
  timestamp: string;
  prevHash: string | null;
  hash: string;
};

export type LedgerStore = {
  getLastHash(): Promise<string | null>;
  append(entry: LedgerEntry): Promise<void>;
  query(): Promise<LedgerEntry[]>;
};

class MemoryLedgerStore implements LedgerStore {
  private entries: LedgerEntry[] = [];

  async getLastHash() {
    return this.entries.length ? this.entries[this.entries.length - 1]!.hash : null;
  }

  async append(entry: LedgerEntry) {
    this.entries.push(entry);
  }

  async query() {
    return [...this.entries];
  }
}

export class Ledger {
  constructor(private store: LedgerStore = new MemoryLedgerStore()) {}

  async append(intent: Intent, decision: AuthorizationDecision, meta: LedgerMeta = {}) {
    const prevHash = await this.store.getLastHash();
    const content = stableStringify({ intent, decision, meta });
    const hash = hashEntry(`${prevHash ?? ""}\n${content}`);

    const entry: LedgerEntry = {
      intent,
      decision,
      meta,
      timestamp: intent.timestamp,
      prevHash,
      hash,
    };

    await this.store.append(entry);
    return entry;
  }

  async query() {
    return this.store.query();
  }
}

export const ledger = new Ledger();
