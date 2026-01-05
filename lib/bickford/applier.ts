// lib/bickford/applier.ts
import fs from "fs";
import path from "path";
import { captureGitDiff } from "./diff";
import { appendToLedger } from "@/lib/ledger/write";

export interface PlanFile {
  path: string;
  content: string;
}

export interface Plan {
  summary: string;
  files: PlanFile[];
  requiresDeploy: boolean;
}

export interface ApplyResult {
  diff: string;
  filesChanged: number;
}

/**
 * Applies a plan to the filesystem and captures the diff
 * @param plan - The plan to apply
 * @param executionId - The execution ID for ledger tracking
 * @returns Apply result with diff information
 */
export async function applyPlan(plan: Plan, executionId: string): Promise<ApplyResult> {
  const cwd = process.cwd();
  
  for (const f of plan.files) {
    // Resolve and validate the path to prevent directory traversal
    const resolvedPath = path.resolve(cwd, f.path);
    
    // Ensure the resolved path is within the current working directory
    if (!resolvedPath.startsWith(cwd)) {
      throw new Error(`Invalid file path: ${f.path} - path traversal detected`);
    }
    
    // Create directory if it doesn't exist
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(resolvedPath, f.content);
  }
  
  // Capture diff after changes
  const diff = captureGitDiff();
  
  // Log to ledger
  appendToLedger({
    type: "FILES_APPLIED",
    executionId,
    diff,
    timestamp: new Date().toISOString(),
  });
  
  return {
    diff,
    filesChanged: plan.files.length,
  };
}
