import { execSync } from "child_process";
import { appendLedgerEvent } from "@/lib/ledger/write";
import { getLastKnownGoodCommit } from "@/lib/recovery/lastKnownGood";

export type RollbackResult = {
  restoredCommit: string;
  pushed: boolean;
};

function assertRollbackEnabled() {
  if (process.env.BICKFORD_ROLLBACK_ENABLED !== "true") {
    throw new Error("BICKFORD_ROLLBACK_ENABLED is not true; refusing to rollback");
  }
  if (process.env.BICKFORD_GIT_ENABLED !== "true") {
    throw new Error("BICKFORD_GIT_ENABLED is not true; refusing to rollback via git");
  }
}

function getFallbackCommit(): string {
  return execSync("git rev-parse HEAD~1", { stdio: ["ignore", "pipe", "ignore"] })
    .toString()
    .trim();
}

export async function rollbackToSafeState(executionId: string, reason: string): Promise<RollbackResult> {
  assertRollbackEnabled();

  let commit: string;
  try {
    commit = getLastKnownGoodCommit();
  } catch {
    // If we have no LKG yet, revert one commit as a deterministic fallback.
    commit = getFallbackCommit();
  }

  execSync(`git reset --hard ${commit}`, { stdio: "inherit" });
  // safer than --force but still autonomous
  execSync("git push --force-with-lease", { stdio: "inherit" });

  appendLedgerEvent({
    id: crypto.randomUUID(),
    executionId,
    type: "ROLLBACK_EXECUTED",
    summary: "Rollback executed",
    details: {
      revertedTo: commit,
      reason,
    },
    timestamp: new Date().toISOString(),
  });

  return { restoredCommit: commit, pushed: true };
}
