import path from "node:path";

import type { CanonRule, ProposedPlanFile } from "./core";

function normalizeSlash(p: string): string {
  return p.replace(/\\/g, "/");
}

function isUnder(prefix: string, filePath: string): boolean {
  const a = normalizeSlash(prefix).replace(/\/$/, "");
  const b = normalizeSlash(filePath);
  return b === a || b.startsWith(a + "/");
}

function looksLikeNodeModules(filePath: string): boolean {
  const p = normalizeSlash(filePath);
  return p.includes("/node_modules/") || p.startsWith("node_modules/") || p === "node_modules";
}

function isCriticalFile(file: ProposedPlanFile): boolean {
  const p = normalizeSlash(file.path);

  if (file.action === "delete") return true;

  if (looksLikeNodeModules(p)) return true;

  // The invariants folder is the "kernel lock".
  if (isUnder("lib/invariants", p)) return true;

  // Refuse writing dotfiles at repo root (common footgun).
  if (!p.includes("/") && p.startsWith(".")) return true;

  // Avoid .env / secrets.
  if (p.endsWith(".env") || p.includes("/.env")) return true;

  return false;
}

export const NoDestructiveActions: CanonRule = {
  id: "CANON-SAFETY-001",
  description: "Bickford may not delete or overwrite critical system files",

  evaluate({ plan }) {
    const forbidden = (plan.files ?? []).find(isCriticalFile);

    if (forbidden) {
      return {
        allowed: false,
        reason: `Destructive or critical action blocked on ${path.posix.normalize(normalizeSlash(forbidden.path))}`,
      };
    }

    return { allowed: true };
  },
};
