import { NextResponse } from "next/server";
import { planFromIntent } from "@/lib/bickford/planner";
import { applyPlan } from "@/lib/bickford/apply";
import { persistPlan } from "@/lib/bickford/persist";
import { appendLedgerEvent } from "@/lib/ledger/write";
import { assertBickfordIdentity } from "@/lib/invariants/bickfordIdentity";
import { assertFounderExecution } from "@/lib/guards/founderGuard";
import { enforceApiAuth, enforceRateLimit, readJson, safeErrorMessage } from "@/lib/apiSecurity";

export const runtime = "nodejs";

type ExecuteBody = {
  intent?: unknown;
};

function shouldUseGitHubMode(): boolean {
  const forced = (process.env.BICKFORD_PERSIST_MODE ?? "").trim().toLowerCase();
  if (forced === "github") return true;
  if (forced === "local") return false;

  if (process.env.NETLIFY === "true") return true;
  return Boolean(process.env.GITHUB_TOKEN);
}

export async function POST(req: Request) {
  assertBickfordIdentity("Bickford");

  const auth = enforceApiAuth(req);
  if (auth) return auth;

  const limited = enforceRateLimit(req, { keyPrefix: "bickford:execute", limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  if (process.env.BICKFORD_EXECUTION_ENABLED !== "true") {
    return NextResponse.json(
      {
        error: "Bickford execution disabled",
        hint: "Set BICKFORD_EXECUTION_ENABLED=true (and BICKFORD_GIT_ENABLED=true, BICKFORD_ROLLBACK_ENABLED=true for remote actions)",
      },
      { status: 403 },
    );
  }

  let executionAuthority: ReturnType<typeof assertFounderExecution>;
  try {
    executionAuthority = assertFounderExecution();
  } catch (e) {
    return NextResponse.json({ error: safeErrorMessage(e) }, { status: 403 });
  }

  const executionId = crypto.randomUUID();
  const parsed = await readJson<ExecuteBody>(req);
  if (!parsed.ok) return parsed.response;

  const body = parsed.value;
  const intent = typeof body.intent === "string" ? body.intent.trim() : "";
  if (!intent) return NextResponse.json({ error: "Missing intent" }, { status: 400 });

  appendLedgerEvent({
    id: crypto.randomUUID(),
    executionId,
    type: "EXECUTION_STARTED",
    summary: intent,
    details: {
      authorizedBy: executionAuthority.authorizedBy,
      authority: executionAuthority.authority,
      publicKeyFingerprint: executionAuthority.publicKeyFingerprint,
      irreversible: executionAuthority.irreversible,
    },
    timestamp: new Date().toISOString(),
  });

  try {
    const plan = await planFromIntent(intent, executionId);
    const githubMode = shouldUseGitHubMode();

    if (!githubMode) {
      await applyPlan(plan, executionId);
    } else {
      appendLedgerEvent({
        id: crypto.randomUUID(),
        executionId,
        type: "FILES_APPLIED",
        summary: String(plan.summary ?? "(no summary)"),
        details: {
          files: (plan.files ?? []).map((f: any) => f.path),
          note: "GitHub mode: files persisted via GitHub API (no local diff)",
        },
        timestamp: new Date().toISOString(),
      });
    }
    const persisted = await persistPlan({ plan, executionId });

    return NextResponse.json({
      executionId,
      summary: plan.summary,
      ...persisted,
    });
  } catch (e) {
    const msg = safeErrorMessage(e);
    appendLedgerEvent({
      id: crypto.randomUUID(),
      executionId,
      type: "DEPLOY_COMPLETE",
      summary: "Execution failed",
      details: { error: msg },
      timestamp: new Date().toISOString(),
    });
    return NextResponse.json({ executionId, error: msg }, { status: 500 });
  }
}
