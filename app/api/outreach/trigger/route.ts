import fs from "fs";
import path from "path";

import { prisma } from "@/lib/prisma";
import { appendLedger } from "@/lib/ledger";

export const runtime = "nodejs";

function requireAuth(req: Request) {
  const token = process.env.OUTREACH_TOKEN || process.env.DATA_ROOM_TOKEN;
  if (!token) {
    throw new Error(
      "OUTREACH_TOKEN (or DATA_ROOM_TOKEN) is not set. Refusing to generate outreach materials without explicit server-side authorization.",
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  const provided = match?.[1] ?? "";
  if (!provided || provided !== token) {
    const err = new Error("Unauthorized");
    (err as any).statusCode = 401;
    throw err;
  }
}

function usd(amount: number) {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

type TriggerKey = "VALUE_1M" | "DENIALS_100" | "DOD_CONTROL_SAT" | "DEMO_PUBLISHED";

function triggerKeyToLabel(key: TriggerKey) {
  switch (key) {
    case "VALUE_1M":
      return "$1M value recovered";
    case "DENIALS_100":
      return "100 denied unsafe actions";
    case "DOD_CONTROL_SAT":
      return "First DoD control satisfied";
    case "DEMO_PUBLISHED":
      return "New demo published";
  }
}

export async function POST(req: Request) {
  try {
    requireAuth(req);

    const outDir = path.join(process.cwd(), "demo", "outreach");
    fs.mkdirSync(outDir, { recursive: true });

    const [denials, complianceArtifacts, demosPublished, priorOutreach] = await Promise.all([
      prisma.ledgerEntry.count({ where: { OR: [{ type: "deny" }, { decision: "DENY" }] } }),
      prisma.ledgerEntry.count({ where: { type: "compliance_artifacts" } }),
      prisma.ledgerEntry.count({ where: { type: "demo_published" } }),
      prisma.ledgerEntry.findMany({ where: { type: "outreach_generated" }, select: { intent: true } }),
    ]);

    // Same simple model as /executive (all-time for triggering)
    const avgIncidentCost = 25_000;
    const loadedEngineerRate = 250;
    const timeSavedHours = denials * 0.25;
    const valueRecovered = denials * avgIncidentCost + timeSavedHours * loadedEngineerRate;

    const triggers: { key: TriggerKey; ok: boolean }[] = [
      { key: "VALUE_1M", ok: valueRecovered >= 1_000_000 },
      { key: "DENIALS_100", ok: denials >= 100 },
      { key: "DOD_CONTROL_SAT", ok: complianceArtifacts >= 1 },
      { key: "DEMO_PUBLISHED", ok: demosPublished >= 1 },
    ];

    const already = new Set(priorOutreach.map((e) => e.intent).filter((v): v is string => typeof v === "string"));

    const fired = triggers.filter((t) => t.ok && !already.has(t.key)).map((t) => t.key);

    if (fired.length === 0) {
      return Response.json({ generated: false, reason: "No new triggers", metrics: { denials, valueRecovered } });
    }

    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const proofPackName = `proof-pack-${ts}.md`;
    const emailName = `email-${ts}.md`;
    const dmName = `linkedin-dm-${ts}.md`;

    const proofPack = [
      "# Bickford Proof Pack (Auto-generated)",
      "",
      `Generated: ${new Date().toISOString()}`,
      "",
      "## Trigger(s)",
      ...fired.map((k) => `- ${triggerKeyToLabel(k)}`),
      "",
      "## Live Metrics", 
      `- Denied unsafe actions: ${denials}`,
      `- Value recovered (model): ${usd(valueRecovered)} (incident=${usd(avgIncidentCost)}; engRate=${usd(loadedEngineerRate)}/hr)`,
      `- Compliance artifact runs: ${complianceArtifacts}`,
      `- Demo publishes: ${demosPublished}`,
      "",
      "## Evidence", 
      "- Ledger is append-only + hash-chained (AU-9)",
      "- Compliance artifacts: /api/compliance/artifacts (Bearer token)",
      "- Executive dashboard: /executive",
      "",
      "## Attachments (recommended)",
      "- bickford-acquisition-data-room.zip (+ .sha256)",
      "- AU-2.md / AU-3.json / AU-9-hash-proof.txt (generated)",
      "",
    ].join("\n");

    const email = [
      "# Outreach Email (Draft)",
      "",
      "**Subject:** Execution Authority: proof of prevented harm + ATO acceleration", 
      "",
      "Team —",
      "",
      "Bickford now gates execution (not reasoning) and emits ATO-ready evidence automatically.",
      "",
      "Fresh signal:",
      ...fired.map((k) => `- ${triggerKeyToLabel(k)}`),
      "",
      `Current totals: ${denials} denied unsafe actions; ${usd(valueRecovered)} value recovered (model).`,
      "",
      "If you want to validate quickly:",
      "- /executive (buyer-facing KPIs)",
      "- /api/compliance/artifacts (AU-2/AU-3/AU-9)",
      "",
      "Reply with the target toolchain (Claude tool calls / internal execution bus / agent runtime) and we’ll provide a 1-day drop-in adapter.",
      "",
      "— Derek",
      "",
    ].join("\n");

    const dm = [
      "# LinkedIn DM (Draft)",
      "",
      "Bickford now wraps execution (not reasoning) and auto-generates AU-2/AU-3/AU-9 evidence from a hash-chained ledger.",
      `We just crossed: ${fired.map(triggerKeyToLabel).join(", ")}.`,
      "If you want a 15-min architecture review, I can share the drop-in Claude execution gate + ATO artifact outputs.",
      "",
    ].join("\n");

    fs.writeFileSync(path.join(outDir, proofPackName), proofPack);
    fs.writeFileSync(path.join(outDir, emailName), email);
    fs.writeFileSync(path.join(outDir, dmName), dm);

    for (const key of fired) {
      await appendLedger({
        type: "outreach_generated",
        intent: key,
        actor: "bickford-system",
        systemInitiated: true,
        valueRecovered,
        denials,
        complianceArtifacts,
        demosPublished,
        outputs: {
          proofPack: `demo/outreach/${proofPackName}`,
          email: `demo/outreach/${emailName}`,
          dm: `demo/outreach/${dmName}`,
        },
      });
    }

    return Response.json({
      generated: true,
      triggersFired: fired,
      outputs: {
        proofPack: `demo/outreach/${proofPackName}`,
        email: `demo/outreach/${emailName}`,
        dm: `demo/outreach/${dmName}`,
      },
      metrics: { denials, valueRecovered, complianceArtifacts, demosPublished },
    });
  } catch (err: any) {
    const status = err?.statusCode ?? 500;
    return new Response(err?.message ?? "Outreach generation failed", { status });
  }
}
