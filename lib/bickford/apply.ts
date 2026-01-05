import fs from "fs";
import path from "path";
import { captureDiff } from "./diff";
import { appendLedgerEvent } from "@/lib/ledger/write";

function assertSafeRelativePath(filePath: string) {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("Invalid file path");
  }
  if (path.isAbsolute(filePath)) {
    throw new Error(`Refusing to write absolute path: ${filePath}`);
  }
  const normalized = path.normalize(filePath);
  if (normalized.startsWith(".." + path.sep) || normalized === "..") {
    throw new Error(`Refusing to write outside workspace: ${filePath}`);
  }
}

export async function applyPlan(plan: any, executionId: string) {
  const beforeDiff = captureDiff();

  for (const file of plan.files ?? []) {
    const p = String(file.path ?? "");
    const content = String(file.content ?? "");
    assertSafeRelativePath(p);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }

  const afterDiff = captureDiff();

  appendLedgerEvent({
    id: crypto.randomUUID(),
    executionId,
    type: "FILES_APPLIED",
    summary: String(plan?.summary ?? "(no summary)"),
    details: {
      files: (plan.files ?? []).map((f: any) => f.path),
      diffBefore: beforeDiff,
      diffAfter: afterDiff,
    },
    timestamp: new Date().toISOString(),
  });
}
