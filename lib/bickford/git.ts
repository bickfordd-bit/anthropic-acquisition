// lib/bickford/git.ts
import { execSync } from "child_process";
import { appendToLedger } from "@/lib/ledger/write";

export interface CommitResult {
  sha: string;
  message: string;
}

/**
 * Commits and pushes changes, returns commit SHA
 * @param msg - Commit message
 * @param executionId - Execution ID for ledger tracking
 * @returns Commit result with SHA
 */
export function commitAndPush(msg: string, executionId: string): CommitResult {
  // Sanitize commit message to prevent command injection
  const sanitizedMsg = msg.replace(/["\\$`]/g, "\\$&");
  
  execSync("git add .");
  execSync(`git commit -m "${sanitizedMsg}"`);
  
  // Get the commit SHA
  const sha = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
  
  execSync("git push");
  
  return {
    sha,
    message: sanitizedMsg,
  };
}

/**
 * Gets the current commit SHA
 * @returns Current commit SHA
 */
export function getCurrentCommitSha(): string {
  return execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
}

/**
 * Gets the previous commit SHA (HEAD~1)
 * @returns Previous commit SHA
 */
export function getPreviousCommitSha(): string {
  return execSync("git rev-parse HEAD~1", { encoding: "utf-8" }).trim();
}
