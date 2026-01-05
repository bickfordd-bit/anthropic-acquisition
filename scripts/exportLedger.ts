import fs from "fs";
import path from "path";
import readline from "readline";
import { prisma } from "../lib/prisma";
import { ensureDir, writeJson, writeText } from "./dataRoom/fsUtils";

export type LedgerExportResult = {
  ledgerJsonlPath: string;
  ledgerChainPath: string;
  ledgerSummaryPath: string;
  entryCount: number;
};

export async function exportLedger(outRoot: string): Promise<LedgerExportResult> {
  const ledgerDir = path.join(outRoot, "LEDGER");
  await ensureDir(ledgerDir);

  const entries = await prisma.ledgerEntry.findMany({ orderBy: { createdAt: "asc" } });

  const ledgerJsonlPath = path.join(ledgerDir, "ledger-export.jsonl");
  const ledgerChainPath = path.join(ledgerDir, "ledger-hash-chain.txt");
  const ledgerSummaryPath = path.join(ledgerDir, "ledger-summary.json");

  const stream = fs.createWriteStream(ledgerJsonlPath, { encoding: "utf8" });

  const chainLines: string[] = [];

  for (const e of entries) {
    let content: unknown = e.content;
    try {
      content = JSON.parse(e.content);
    } catch {
      // leave as string
    }

    const payload = {
      id: e.id,
      type: e.type,
      createdAt: e.createdAt.toISOString(),
      prevHash: e.prevHash ?? null,
      hash: e.hash,
      content,
    };

    stream.write(JSON.stringify(payload) + "\n");
    chainLines.push(e.hash);
  }

  await new Promise<void>((resolve, reject) => {
    stream.end(() => resolve());
    stream.on("error", reject);
  });

  await writeText(ledgerChainPath, chainLines.join("\n"));

  const summary = {
    totalEntries: entries.length,
    firstTimestamp: entries[0]?.createdAt?.toISOString() ?? null,
    lastTimestamp: entries[entries.length - 1]?.createdAt?.toISOString() ?? null,
    headHash: entries[entries.length - 1]?.hash ?? null,
  };

  await writeJson(ledgerSummaryPath, summary);

  // Quick sanity check: ensure JSONL is line-readable (catches stream truncation issues).
  const rl = readline.createInterface({ input: fs.createReadStream(ledgerJsonlPath) });
  let lineCount = 0;
  for await (const _line of rl) lineCount++;
  if (lineCount !== entries.length) {
    throw new Error(`Ledger export line count mismatch: expected ${entries.length}, got ${lineCount}`);
  }

  return { ledgerJsonlPath, ledgerChainPath, ledgerSummaryPath, entryCount: entries.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.env.DATA_ROOM_OUT ?? path.join(process.cwd(), "bickford-acquisition-data-room");
  exportLedger(out).then(() => {
    // eslint-disable-next-line no-console
    console.log(`Ledger exported to ${out}/LEDGER`);
  });
}
