import { prisma } from "@/lib/prisma";
import { appendLedger } from "@/lib/ledger";
import { hashEntry, hashObject } from "@/lib/hash";
import { scoreOPTR } from "@/lib/optr";
import { gateIntent } from "@/lib/permissions";
import { generateIntentWithProvenance } from "@/lib/claude";
import { routeIntent } from "@/lib/routeIntent";
import { authorize } from "@/lib/canon";
import { getLastExecutionEntries } from "@/lib/ledger";
import { enforceNonInterference } from "@/lib/nonInterference";
import { arbitrate } from "@/lib/arbitration";
import { demoGenerateIntent, isDemoMode, redactIfDemo } from "@/lib/demo";

export const runtime = "nodejs";

type ExecuteBody = {
  prompt?: unknown;
  viaClaude?: unknown;
  risk?: unknown;
  allowedRisk?: unknown;
  title?: unknown;
  intent?: unknown;
  dryRun?: unknown;
  ttvImpact?: unknown;
  toolName?: unknown;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as ExecuteBody;

  // Kernel path: intent → canon check → ledger append (hash-chained)
  if (typeof body.intent === "string") {
    const intent = String(body.intent).trim();
    if (!intent) return Response.json({ error: "Missing intent" }, { status: 400 });

    const dryRun = Boolean(body.dryRun ?? false);

    try {
      gateIntent("bickford-system", intent);
    } catch (e) {
      return Response.json({ error: String((e as Error).message ?? e) }, { status: 403 });
    }

    const risk = Number(body.risk ?? 1);
    const allowedRisk = Number(body.allowedRisk ?? 2);
    const optr = scoreOPTR({ risk, allowedRisk });
    const toolName = typeof body.toolName === "string" ? body.toolName : "execution";
    const ttvImpact =
      body.ttvImpact && typeof body.ttvImpact === "object" && !Array.isArray(body.ttvImpact)
        ? (body.ttvImpact as Record<string, number>)
        : undefined;

    const ni = enforceNonInterference(intent, {
      actor: "bickford-system",
      action: toolName,
      ttvImpact,
    });
    const auth = authorize(intent);
    const arb = arbitrate([intent]);
    const allowed = auth.decision === "ALLOW" && ni.ok && arb.allowed && optr.admissible;
    const decision = allowed ? "ALLOW" : "DENY";

    const why = allowed
      ? "Authorized by canon, non-interference, and OPTR"
      : auth.decision === "DENY"
        ? `${auth.canon}: ${auth.rationale}`
        : !ni.ok
          ? ni.reason
          : !arb.allowed
            ? arb.reason
            : optr.reason;

    if (dryRun) {
      return Response.json(
        redactIfDemo({
          intent,
          intentHash: hashEntry(intent),
          decision,
          canon: auth.canon,
          rationale: auth.rationale,
          nonInterference: ni.ok,
          nonInterferenceReason: ni.ok ? null : ni.reason,
          arbitration: arb.allowed,
          arbitrationReason: arb.allowed ? null : (arb as any).reason,
          optr,
          why,
          dryRun: true,
        }),
      );
    }

    const entry = await appendLedger({
      type: "execution",
      intent,
      decision,
      canon: auth.canon,
      rationale: auth.rationale,
      intentHash: hashEntry(intent),
      nonInterference: ni.ok,
      nonInterferenceReason: ni.ok ? null : ni.reason,
      nonInterferenceCode: (ni as any).code ?? null,
      nonInterferenceViolatedAgent: (ni as any).violatedAgent ?? null,
      nonInterferenceDelta: (ni as any).delta ?? null,
      ttvImpact: ttvImpact ?? null,
      arbitration: arb.allowed,
      arbitrationReason: arb.allowed ? null : (arb as any).reason,
      optr,
      actor: "bickford-system",
      systemInitiated: true,
      why,
    });

    return Response.json(
      redactIfDemo({
        intent,
        decision,
        canon: auth.canon,
        rationale: auth.rationale,
        intentHash: hashEntry(intent),
        nonInterference: ni.ok,
        nonInterferenceReason: ni.ok ? null : ni.reason,
        nonInterferenceCode: (ni as any).code ?? null,
        nonInterferenceViolatedAgent: (ni as any).violatedAgent ?? null,
        nonInterferenceDelta: (ni as any).delta ?? null,
        ttvImpact: ttvImpact ?? null,
        arbitration: arb.allowed,
        arbitrationReason: arb.allowed ? null : (arb as any).reason,
        optr,
        why,
        actor: entry.actor ?? "bickford-system",
        systemInitiated: entry.systemInitiated,
        ledgerHash: entry.hash,
        prevHash: entry.prevHash,
        createdAt: entry.createdAt,
        entryId: entry.id,
      }),
    );
  }

  const prompt = String(body.prompt ?? "").trim();
  const viaClaude = Boolean(body.viaClaude ?? false);
  const risk = Number(body.risk ?? 1);
  const allowedRisk = Number(body.allowedRisk ?? 2);
  const title = String(body.title ?? "Live Canon");
  const actor = viaClaude ? "claude" : "user";

  if (!prompt) {
    return Response.json({ error: "Missing prompt" }, { status: 400 });
  }

  // invariant checks (never allow bypass language)
  try {
    gateIntent(actor, prompt);
  } catch (e) {
    return Response.json({ error: String((e as Error).message ?? e) }, { status: 403 });
  }

  const demo = isDemoMode();
  const provenance = viaClaude && !demo ? await generateIntentWithProvenance(prompt) : null;
  const intentText = viaClaude ? (demo ? demoGenerateIntent(prompt) : provenance!.text) : prompt;

  const { branch } = routeIntent(intentText);

  // treat Claude output as untrusted input too
  try {
    gateIntent(actor, intentText);
  } catch (e) {
    return Response.json({ error: String((e as Error).message ?? e) }, { status: 403 });
  }

  const intent = {
    type: "intent" as const,
    branch,
    text: intentText,
    risk,
    allowedRisk,
    actor,
    systemInitiated: true,
    provenance: {
      viaClaude,
      prompt: viaClaude ? prompt : undefined,
      model: provenance?.model,
      providerMessageId: provenance?.id,
      intentHash: provenance?.hash,
    },
  };

  const optr = scoreOPTR(intent);
  const ni = enforceNonInterference(intentText);
  const auth = authorize(intentText);
  const arb = arbitrate([intentText]);

  const allowed = optr.admissible && ni.ok && arb.allowed && auth.decision === "ALLOW";

  const why = allowed
    ? "Authorized by canon, non-interference, and OPTR"
    : auth.decision === "DENY"
      ? `${auth.canon}: ${auth.rationale}`
      : !ni.ok
        ? ni.reason
        : !arb.allowed
          ? arb.reason
        : optr.reason;

  if (!allowed) {
    await appendLedger({
      type: "deny",
      reason: why,
      actor,
      systemInitiated: true,
      intent,
      canon: auth.canon,
      rationale: auth.rationale,
      nonInterference: ni.ok,
      nonInterferenceReason: ni.ok ? null : ni.reason,
      arbitration: arb.allowed,
      arbitrationReason: arb.allowed ? null : (arb as any).reason,
      optr,
      why,
    });

    return Response.json(
      redactIfDemo({
        admissible: false,
        decision: "DENY",
        reason: why,
        why,
        canon: auth.canon,
        rationale: auth.rationale,
        nonInterference: ni.ok,
        nonInterferenceReason: ni.ok ? null : ni.reason,
        arbitration: arb.allowed,
        arbitrationReason: arb.allowed ? null : (arb as any).reason,
        optr,
        intent: intentText,
        intentHash: hashEntry(intentText),
        viaClaude,
        systemInitiated: true,
      }),
      { status: 403 },
    );
  }

  // ledger-first: record the intent that will be canon-promoted
  await appendLedger(intent);

  // canon promotion mirrors app/api/canon/commit
  const canonBody = { title, branch, intent };
  const ledgerHash = hashObject(canonBody);

  const canon = await prisma.canonEntry.create({
    data: {
      title,
      content: JSON.stringify(canonBody),
      ledgerHash,
    },
  });

  await appendLedger({
    type: "canon",
    canonId: canon.id,
    ledgerHash,
    title: canon.title,
  });

  const executionEntry = await appendLedger({
    type: "execution",
    branch,
    prompt,
    intent: intentText,
    intentHash: hashEntry(intentText),
    decision: "ALLOW",
    canon: auth.canon,
    rationale: auth.rationale,
    nonInterference: true,
    nonInterferenceReason: null,
    arbitration: arb.allowed,
    arbitrationReason: null,
    optr,
    why,
    actor,
    model: provenance?.model ?? null,
    providerMessageId: provenance?.id ?? null,
    systemInitiated: true,
    canonId: canon.id,
    canonLedgerHash: ledgerHash,
  });

  return Response.json(
    redactIfDemo({
      admissible: true,
      score: optr.score,
      intent: intentText,
      viaClaude,
      branch,
      canonId: canon.id,
      ledgerHash,
      decision: "ALLOW",
      why,
      canon: auth.canon,
      rationale: auth.rationale,
      nonInterference: true,
      arbitration: arb.allowed,
      intentHash: hashEntry(intentText),
      systemInitiated: true,
      executionLedgerHash: executionEntry.hash,
    }),
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const takeParam = url.searchParams.get("take");
  const take = Math.max(1, Math.min(50, Number(takeParam ?? 20) || 20));

  const entries = await getLastExecutionEntries(take);
  const last = entries[0] ?? null;

  return Response.json({ last, entries });
}
