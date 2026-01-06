import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function usd(amount: number) {
  return amount.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function clampNonNeg(n: number) {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export default async function ExecutivePage() {
  const hasDatabase = Boolean(process.env.DATABASE_URL);
  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since1h = new Date(now.getTime() - 60 * 60 * 1000);

  const [last24h, last1h, totals] = hasDatabase
    ? await Promise.all([
        prisma.ledgerEntry.findMany({
          where: { createdAt: { gte: since24h } },
          orderBy: { createdAt: "desc" },
          take: 2000,
        }),
        prisma.ledgerEntry.findMany({
          where: { createdAt: { gte: since1h } },
          orderBy: { createdAt: "desc" },
          take: 2000,
        }),
        prisma.ledgerEntry.count(),
      ])
    : [[], [], 0];

  const decisionEntries24h = last24h.filter((e) => e.decision === "ALLOW" || e.decision === "DENY");
  const decisionsPerHour = Math.round((decisionEntries24h.length / 24) * 10) / 10;

  const apiUsage = decisionEntries24h.reduce(
    (acc, e) => {
      const parsed = typeof e.content === "string" ? safeParseJson(e.content) : null;
      const api = (parsed as any)?.api;
      const surface = (parsed as any)?.surface;

      if (api === "toolWrapper" || surface === "tool-wrapper") {
        acc.toolWrapper += 1;
      } else if (e.actor === "claude") {
        acc.legacyClaude += 1;
      } else if (e.actor === "bickford-system") {
        acc.executeWithBickford += 1;
      }

      acc.total += 1;
      return acc;
    },
    { total: 0, executeWithBickford: 0, legacyClaude: 0, toolWrapper: 0 },
  );

  const primaryUsagePct = apiUsage.total
    ? Math.round((apiUsage.executeWithBickford / apiUsage.total) * 100)
    : 0;

  const deniedUnsafeActions24h = clampNonNeg(
    last24h.filter((e) => e.type === "deny" || e.decision === "DENY").length,
  );

  const complianceArtifacts24h = clampNonNeg(last24h.filter((e) => e.type === "compliance_artifacts").length);
  const demosPublished24h = clampNonNeg(last24h.filter((e) => e.type === "demo_published").length);

  // Simple buyer-facing value model (tunable constants)
  const avgIncidentCost = 25_000;
  const loadedEngineerRate = 250; // $/hr
  const timeSavedHours = deniedUnsafeActions24h * 0.25; // 15 minutes per prevented incident

  const valueRecovered =
    deniedUnsafeActions24h * avgIncidentCost +
    timeSavedHours * loadedEngineerRate;

  const denialsLastHour = clampNonNeg(last1h.filter((e) => e.type === "deny" || e.decision === "DENY").length);

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold">Executive Dashboard</h1>
              <p className="text-sm text-neutral-400">
                Live proof: authorization decisions → prevented harm → recovered value → compliance artifacts.
              </p>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <a
                href="/executive/ledger"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10"
              >
                Ledger Playback
              </a>
              <a
                href="/executive/demo"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10"
              >
                Buyer Demo
              </a>
            </div>
          </div>
        </div>

        {!hasDatabase ? (
          <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
            <div className="font-medium">Metrics unavailable</div>
            <div className="mt-1 text-amber-200/80">
              This environment is missing <span className="font-mono">DATABASE_URL</span>, so ledger-backed metrics are
              shown as zeros.
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-neutral-400">Decisions / hour (24h avg)</div>
            <div className="mt-2 text-3xl font-semibold">{decisionsPerHour}</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-neutral-400">Denied unsafe actions (24h)</div>
            <div className="mt-2 text-3xl font-semibold">{deniedUnsafeActions24h}</div>
            <div className="mt-1 text-xs text-neutral-500">Last hour: {denialsLastHour}</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-neutral-400">API usage (24h decisions)</div>
            <div className="mt-2 text-3xl font-semibold">{primaryUsagePct}%</div>
            <div className="mt-1 text-xs text-neutral-500">
              executeWithBickford: {apiUsage.executeWithBickford} · legacy: {apiUsage.legacyClaude} · toolWrapper:{" "}
              {apiUsage.toolWrapper}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-neutral-400">Value recovered (24h model)</div>
            <div className="mt-2 text-3xl font-semibold">{usd(valueRecovered)}</div>
            <div className="mt-1 text-xs text-neutral-500">
              Model: {usd(avgIncidentCost)} / deny + {usd(loadedEngineerRate)}/hr × {timeSavedHours.toFixed(1)} hrs
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-neutral-400">Compliance artifacts generated (24h)</div>
            <div className="mt-2 text-3xl font-semibold">{complianceArtifacts24h}</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-neutral-400">Demo videos published (24h)</div>
            <div className="mt-2 text-3xl font-semibold">{demosPublished24h}</div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-neutral-400">Ledger entries (total)</div>
            <div className="mt-2 text-3xl font-semibold">{totals}</div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-neutral-400">Recent activity</div>
          <div className="mt-3 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-neutral-400">
                <tr>
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Decision</th>
                  <th className="py-2 pr-3">Actor</th>
                  <th className="py-2">Hash</th>
                </tr>
              </thead>
              <tbody className="text-neutral-200">
                {last24h.slice(0, 20).map((e) => (
                  <tr key={e.id} className="border-t border-white/5">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {new Date(e.createdAt).toISOString()}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">{e.type}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{e.decision ?? "—"}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{e.actor ?? "—"}</td>
                    <td className="py-2 font-mono text-xs break-all">{e.hash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
