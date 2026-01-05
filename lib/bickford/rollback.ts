// lib/bickford/rollback.ts

import { execSync } from "child_process";
import { appendToLedger } from "@/lib/ledger/write";

export interface RollbackResult {
  success: boolean;
  previousCommit: string;
  reason: string;
}

/**
 * Reverts to the last good commit on deploy failure
 * Performs hard reset and force push
 * @param reason - Reason for rollback
 * @param executionId - Execution ID for ledger tracking
 * @returns Rollback result
 */
export async function rollbackToLastCommit(
  reason: string,
  executionId: string
): Promise<RollbackResult> {
  try {
    // Get the previous commit
    const previousCommit = execSync("git rev-parse HEAD~1", { encoding: "utf-8" }).trim();

    // Hard reset to previous commit
    execSync(`git reset --hard ${previousCommit}`);

    // Force push to remote
    execSync("git push --force");

    // Log rollback to ledger
    appendToLedger({
      type: "ROLLBACK_EXECUTED",
      executionId,
      reason,
      previousCommit,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      previousCommit,
      reason,
    };
  } catch (error: any) {
    console.error("Rollback failed:", error.message);
    throw new Error(`Rollback failed: ${error.message}`);
  }
}
