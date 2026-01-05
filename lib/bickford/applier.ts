// lib/bickford/applier.ts
import fs from "fs";

export async function applyPlan(plan: any) {
  for (const f of plan.files) {
    fs.writeFileSync(f.path, f.content);
  }
}
