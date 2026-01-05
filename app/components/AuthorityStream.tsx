"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type LedgerEntry = {
  id: string;
  type: string;
  content: unknown;
  hash: string;
  createdAt: string;
};

export default function AuthorityStream() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [status, setStatus] = useState<"connecting" | "open" | "closed">(
    "connecting",
  );
  const seen = useRef(new Set<string>());

  const ordered = useMemo(
    () => entries.slice().sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt)),
    [entries],
  );

  useEffect(() => {
    const evt = new EventSource("/api/ledger/stream");

    evt.onopen = () => setStatus("open");
    evt.onerror = () => setStatus("closed");
    evt.onmessage = (e) => {
      const data = JSON.parse(e.data) as LedgerEntry;
      if (seen.current.has(data.id)) return;
      seen.current.add(data.id);
      setEntries((prev) => [...prev, data]);
    };

    return () => evt.close();
  }, []);

  return (
    <section className="rounded-lg border bg-zinc-50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Live Ledger (SSE)</h2>
        <div className="text-xs text-zinc-600">{status}</div>
      </div>

      <div className="max-h-72 overflow-auto rounded-md border bg-white">
        {ordered.length === 0 ? (
          <div className="p-3 text-sm text-zinc-600">No ledger entries yet.</div>
        ) : (
          <ul className="divide-y">
            {ordered.map((e) => (
              <li key={e.id} className="p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{e.type}</div>
                  <div className="text-xs text-zinc-500">
                    {new Date(e.createdAt).toLocaleTimeString()}
                  </div>
                </div>
                <div className="mt-2 text-xs text-zinc-600 break-all">hash: {e.hash}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
