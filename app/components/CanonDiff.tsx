"use client";

import { useEffect, useState } from "react";

type CanonDiffItem = {
  id: string;
  title: string;
  promotedAt: string;
  previous: unknown | null;
  current: unknown;
  changedKeys: string[];
};

export default function CanonDiff() {
  const [diffs, setDiffs] = useState<CanonDiffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (!cancelled) setError(null);

        const res = await fetch("/api/canon/diff", { cache: "no-store" });
        const contentType = res.headers.get("content-type") ?? "";

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Request failed (${res.status})`);
        }

        if (!contentType.toLowerCase().includes("application/json")) {
          const text = await res.text().catch(() => "");
          throw new Error(text || "Expected JSON response");
        }

        const data = (await res.json().catch(() => [])) as unknown;
        if (!cancelled) setDiffs(Array.isArray(data) ? (data as CanonDiffItem[]) : []);
      } catch (e: any) {
        if (!cancelled) {
          setDiffs([]);
          setError(String(e?.message ?? e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const t = setInterval(load, 2000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <section className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Canon Evolution</h2>
        <div className="text-xs text-zinc-600">{loading ? "loading" : "live"}</div>
      </div>

      <div className="max-h-[32rem] overflow-auto rounded-md border bg-white">
        {error ? (
          <div className="p-3 text-sm text-red-700 whitespace-pre-wrap">{error}</div>
        ) : null}
        {diffs.length === 0 ? (
          <div className="p-3 text-sm text-zinc-600">No canon promoted yet.</div>
        ) : (
          <ul className="divide-y">
            {diffs
              .slice()
              .reverse()
              .map((d) => (
                <li key={d.id} className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{d.title}</div>
                      <div className="text-xs text-zinc-500">
                        {new Date(d.promotedAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-600">
                      {d.changedKeys.length === 0
                        ? "no structural change"
                        : `${d.changedKeys.length} key(s) changed`}
                    </div>
                  </div>

                  {d.changedKeys.length > 0 && (
                    <div className="text-xs text-zinc-600">
                      changed: {d.changedKeys.slice(0, 8).join(", ")}
                      {d.changedKeys.length > 8 ? "…" : ""}
                    </div>
                  )}

                  <pre className="overflow-auto rounded-md bg-zinc-50 p-2 text-xs">
{JSON.stringify(d.current, null, 2)}
                  </pre>
                </li>
              ))}
          </ul>
        )}
      </div>
    </section>
  );
}
