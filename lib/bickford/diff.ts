import { execSync } from "child_process";

export function captureDiff(): string {
  try {
    return execSync("git diff", { stdio: ["ignore", "pipe", "ignore"] }).toString();
  } catch {
    return "";
  }
}
