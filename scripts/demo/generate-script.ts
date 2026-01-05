import fs from "fs";
import path from "path";
import { execSync } from "child_process";

function gitDiffSummary(): string {
  try {
    const base = process.env.GITHUB_BASE_REF
      ? `origin/${process.env.GITHUB_BASE_REF}`
      : process.env.GITHUB_EVENT_NAME === "push"
        ? `${process.env.GITHUB_SHA}~1`
        : "HEAD~1";
    const out = execSync(`git diff --name-status ${base} ${process.env.GITHUB_SHA ?? "HEAD"}`, {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    return out || "(no file changes detected)";
  } catch {
    return "(diff unavailable)";
  }
}

const demoDir = path.join(process.cwd(), "demo");
fs.mkdirSync(demoDir, { recursive: true });

const script = `TITLE: Bickford Live Demo

TRIGGER:
- commit: ${process.env.GITHUB_SHA ?? "local"}

CHANGE SUMMARY:
${gitDiffSummary()}

SCENES:
1) Allowed execution -> ledger append
2) Canon-based denial (immutability)
3) Data-room export (deterministic ZIP)
4) Auditability recap
`;

fs.writeFileSync(path.join(demoDir, "script.txt"), script);

// eslint-disable-next-line no-console
console.log("📝 Demo script generated");
