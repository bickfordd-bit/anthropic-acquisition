"use client";

import { useEffect, useState } from "react";

export default function ExecutionLedger({ executionId }: { executionId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);

    fetch(`/api/bickford/ledger/${executionId}`)
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok, j }) => {
        if (cancelled) return;
        if (!ok) {
          setError(String(j?.error ?? "Failed to load ledger"));
          setEvents([]);
          return;
        }
        setEvents(Array.isArray(j) ? j : []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String((e as Error)?.message ?? e));
        setEvents([]);
      });

    return () => {
      cancelled = true;
    };
  }, [executionId]);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">Execution Ledger</h3>
      {error ? <div className="text-xs text-red-600">{error}</div> : null}
      {events.map((e) => (
        <div key={e.id} className="rounded-md border border-zinc-200 p-3">
          <div className="flex items-center justify-between">
            <strong className="text-xs">{e.type}</strong>
            <span className="text-[11px] text-zinc-500">{e.timestamp}</span>
          </div>
          <div className="text-xs text-zinc-800 mt-1">{e.summary}</div>
          {e.details?.diffAfter ? (
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-zinc-950 p-3 text-[11px] text-green-200">
              {e.details.diffAfter}
            </pre>
          ) : null}
        </div>
      ))}
    </div>
  );
}
