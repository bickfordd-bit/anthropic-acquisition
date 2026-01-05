// lib/bickford/git.ts
import { execSync } from "child_process";

export function commitAndPush(msg: string) {
  execSync("git add .");
  execSync(`git commit -m "${msg}"`);
  execSync("git push");
}
