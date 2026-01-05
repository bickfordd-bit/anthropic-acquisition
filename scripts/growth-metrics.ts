import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

function safeReadJson<T>(p: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as T;
  } catch {
    return null;
  }
}

function countJsonlLines(filePath: string): number {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw.trim()) return 0;
    return raw.trim().split("\n").filter(Boolean).length;
  } catch {
    return 0;
  }
}

function gitCommit(): string | null {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

const repoRoot = process.cwd();
const outDir = path.join(repoRoot, "growth");
fs.mkdirSync(outDir, { recursive: true });

const dataRoomRoot = path.join(repoRoot, "bickford-acquisition-data-room");
const canonIndexPath = path.join(dataRoomRoot, "CANON", "canon-index.json");
const ledgerJsonlPath = path.join(dataRoomRoot, "LEDGER", "ledger-export.jsonl");
const ledgerSummaryPath = path.join(dataRoomRoot, "LEDGER", "ledger-summary.json");

const canonIndex = safeReadJson<Array<any>>(canonIndexPath) ?? [];
const ledgerSummary = safeReadJson<Record<string, any>>(ledgerSummaryPath) ?? null;
const ledgerEntries = countJsonlLines(ledgerJsonlPath);

const metrics = {
  timestamp: new Date().toISOString(),
  commit: process.env.GITHUB_SHA ?? gitCommit(),
  canon: {
    entries: canonIndex.length,
  },
  ledger: {
    entries: ledgerEntries,
    summary: ledgerSummary,
  },
};

fs.writeFileSync(path.join(outDir, "latest.json"), JSON.stringify(metrics, null, 2) + "\n");

// eslint-disable-next-line no-console
console.log("📈 Growth metrics updated", metrics);
