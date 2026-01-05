// lib/bickford/git.ts
import { execSync } from "child_process";

export function commitAndPush(msg: string) {
  // Sanitize commit message to prevent command injection
  const sanitizedMsg = msg.replace(/["\\$`]/g, "\\$&");
  execSync("git add .");
  execSync(`git commit -m "${sanitizedMsg}"`);
  execSync("git push");
}
