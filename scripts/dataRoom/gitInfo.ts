import { execFileSync } from "child_process";

export function getGitInfo(): { commit?: string; branch?: string; dirty?: boolean } {
  try {
    const commit = execFileSync("git", ["rev-parse", "HEAD"], { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    const dirty = execFileSync("git", ["status", "--porcelain"], { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim().length > 0;
    return { commit, branch, dirty };
  } catch {
    return {};
  }
}
