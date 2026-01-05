// lib/bickford/diff.ts

import { execSync } from "child_process";

/**
 * Captures the git diff before changes are committed
 * @returns Git diff output as string
 */
export function captureGitDiff(): string {
  try {
    // Get diff of staged and unstaged changes
    const diff = execSync("git diff HEAD", { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });
    return diff;
  } catch (error) {
    // If git diff fails (e.g., no changes), return empty string
    return "";
  }
}

/**
 * Gets the current git status
 * @returns Git status output
 */
export function getGitStatus(): string {
  try {
    return execSync("git status --short", { encoding: "utf-8" });
  } catch (error) {
    return "";
  }
}
