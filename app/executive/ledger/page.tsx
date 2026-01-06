import Link from "next/link";
import AutoRefresh from "./AutoRefresh";
import { readAllLedgerEvents } from "@/lib/ledger/read";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchParams = {
  executionId?: string;
  take?: string;
};

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function fmtTs(ts: string) {
  try {
    return new Date(ts).toISOString();
  } catch {
    return ts;
  }
}

function badgeClass(type: string) {
  const t = type.toUpperCase();
  if (t.includes("ROLLBACK")) return "border-red-400/30 bg-red-400/10 text-red-200";
  if (t.includes("SELF_HEAL")) return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  if (t.includes("DEPLOY")) return "border-sky-400/30 bg-sky-400/10 text-sky-200";
  if (t.includes("EXECUTION")) return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  if (t.includes("PLAN") || t.includes("FILES")) return "border-violet-400/30 bg-violet-400/10 text-violet-200";
  return "border-white/10 bg-white/5 text-neutral-200";
}

export default async function LedgerPlaybackPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const requestedExecutionId = String(sp.executionId ?? "").trim();
  const take = clamp(Number(sp.take ?? "200") || 200, 20, 2000);

  const all = readAllLedgerEvents();
  const reversed = [...all].reverse();

  const executionIds = Array.from(new Set(reversed.map((e) => e.executionId))).slice(0, 100);

  const filtered = requestedExecutionId
    ? reversed.filter((e) => e.executionId === requestedExecutionId)
    : reversed;

  const entries = filtered.slice(0, take);
  const counts = entries.reduce(
    (acc, e) => {
      acc.total += 1;
      acc[e.type] = (acc[e.type] ?? 0) + 1;
      return acc;
    },
    { total: 0 } as Record<string, number>,
  );

  const topTypes = Object.entries(counts)
    .filter(([k]) => k !== "total")
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const baseParams = new URLSearchParams();
  baseParams.set("take", String(take));

  return (
    <main className="min-h-screen p-8">
      <AutoRefresh intervalMs={2000} />

      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold">Ledger Playback</h1>
            <p className="text-sm text-neutral-400">
              Live, append-only execution timeline (event ledger). Use this to narrate rollbacks and self-heals.
            </p>
            <div className="text-xs text-neutral-500">
              Source: <span className="font-mono">ledger/ledger.jsonl</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Link href="/executive" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10">
              Executive
            </Link>
            <Link href="/" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10">
              Home
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <div className="text-sm text-neutral-400">View</div>
              <div className="text-2xl font-semibold">{requestedExecutionId ? "Single execution" : "All executions"}</div>
              <div className="text-xs text-neutral-500">
                Showing {entries.length} of {filtered.length} events
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <div className="text-xs text-neutral-500">Execution</div>
                <div className="mt-1">
                  <div className="relative">
                    <select
                      value={requestedExecutionId}
                      onChange={() => { /* server-controlled; select uses links below */ }}
                      className="w-full appearance-none rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-neutral-200"
                      disabled
                    >
                      <option value="">All</option>
                    </select>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link
                        href={`/executive/ledger?${(() => {
                          const p = new URLSearchParams(baseParams);
                          p.delete("executionId");
                          return p.toString();
                        })()}`}
                        className={`rounded-full border px-3 py-1 text-xs ${
                          !requestedExecutionId ? "border-white/20 bg-white/10" : "border-white/10 bg-white/5"
                        }`}
                      >
                        All
                      </Link>
                      {executionIds.slice(0, 12).map((id) => (
                        <Link
                          key={id}
                          href={`/executive/ledger?${(() => {
                            const p = new URLSearchParams(baseParams);
                            p.set("executionId", id);
                            return p.toString();
                          })()}`}
                          className={`rounded-full border px-3 py-1 text-xs font-mono ${
                            requestedExecutionId === id
                              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                              : "border-white/10 bg-white/5 text-neutral-200"
                          }`}
                          title={id}
                        >
                          {id.slice(0, 8)}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-xs text-neutral-500">Take</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {[50, 200, 500, 2000].map((n) => (
                    <Link
                      key={n}
                      href={`/executive/ledger?${(() => {
                        const p = new URLSearchParams();
                        p.set("take", String(n));
                        if (requestedExecutionId) p.set("executionId", requestedExecutionId);
                        return p.toString();
                      })()}`}
                      className={`rounded-lg border px-3 py-2 text-sm ${
                        take === n ? "border-white/20 bg-white/10" : "border-white/10 bg-white/5"
                      }`}
                    >
                      {n}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-neutral-500">Top event types</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {topTypes.length === 0 ? (
                    <div className="text-sm text-neutral-400">No events yet</div>
                  ) : (
                    topTypes.map(([type, count]) => (
                      <span
                        key={type}
                        className={`rounded-full border px-3 py-1 text-xs ${badgeClass(type)}`}
                      >
                        {type} · {count}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-neutral-400">Timeline</div>
          <div className="mt-3 space-y-3">
            {entries.length === 0 ? (
              <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm text-neutral-300">
                No ledger events found. Trigger a Bickford execution to populate the event ledger.
              </div>
            ) : null}

            {entries.map((e) => (
              <div key={e.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs ${badgeClass(e.type)}`}>{e.type}</span>
                      <span className="text-xs text-neutral-500">{fmtTs(e.timestamp)}</span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-mono text-neutral-200" title={e.executionId}>
                        {e.executionId.slice(0, 12)}
                      </span>
                    </div>
                    <div className="text-sm text-neutral-200">{e.summary}</div>
                  </div>

                  <div className="text-xs text-neutral-500 font-mono">{e.id.slice(0, 12)}</div>
                </div>

                {e.details ? (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-neutral-400 hover:text-neutral-200">
                      Details
                    </summary>
                    <pre className="mt-2 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-neutral-200">
                      <code>{JSON.stringify(e.details, null, 2)}</code>
                    </pre>
                  </details>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
