// lib/bickford/applier.ts
import fs from "fs";
import path from "path";

export interface PlanFile {
  path: string;
  content: string;
}

export interface Plan {
  summary: string;
  files: PlanFile[];
  requiresDeploy: boolean;
}

export async function applyPlan(plan: Plan) {
  const cwd = process.cwd();
  
  for (const f of plan.files) {
    // Resolve and validate the path to prevent directory traversal
    const resolvedPath = path.resolve(cwd, f.path);
    
    // Ensure the resolved path is within the current working directory
    if (!resolvedPath.startsWith(cwd)) {
      throw new Error(`Invalid file path: ${f.path} - path traversal detected`);
    }
    
    fs.writeFileSync(resolvedPath, f.content);
  }
}
