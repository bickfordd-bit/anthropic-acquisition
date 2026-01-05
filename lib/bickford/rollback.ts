import { execSync } from "child_process";
import { appendLedgerEvent } from "@/lib/ledger/write";

export async function rollbackLastCommit(executionId: string, reason: string) {
  if (process.env.BICKFORD_ROLLBACK_ENABLED !== "true") {
    throw new Error("BICKFORD_ROLLBACK_ENABLED is not true; refusing to rollback");
  }

  const lastGood = execSync("git rev-parse HEAD~1", { stdio: ["ignore", "pipe", "ignore"] })
    .toString()
    .trim();

  execSync(`git reset --hard ${lastGood}`, { stdio: "inherit" });
  execSync("git push --force", { stdio: "inherit" });

  appendLedgerEvent({
    id: crypto.randomUUID(),
    executionId,
    type: "ROLLBACK_EXECUTED",
    summary: "Rollback executed",
    details: {
      revertedTo: lastGood,
      reason,
    },
    timestamp: new Date().toISOString(),
  });

  return lastGood;
}
