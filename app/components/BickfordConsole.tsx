"use client";

import { useState } from "react";
import ExecutionLedger from "@/app/components/ExecutionLedger";

export default function BickfordConsole() {
  const [intent, setIntent] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("bickfordToken") ?? "";
  });

  async function execute() {
    const trimmed = intent.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      const res = await fetch("/api/bickford/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-bickford-token": token } : {}),
        },
        body: JSON.stringify({ intent: trimmed }),
      });

      const out = await res.json();
      if (!res.ok) {
        setLog((l) => [...l, `Error: ${out?.error || "Unknown error occurred"}`]);
        if (out?.executionId) setExecutionId(String(out.executionId));
        return;
      }

      if (out?.executionId) setExecutionId(String(out.executionId));
      setLog((l) =>
        [
          ...l,
          `✓ ${out.summary}`,
          out.sha ? `SHA → ${out.sha}` : "",
          out.prUrl ? `PR → ${out.prUrl}` : "",
          out.deployUrl ? `DEPLOY → ${out.deployUrl}` : "",
          out.mode ? `MODE → ${out.mode}` : "",
        ].filter(Boolean),
      );
      setIntent("");
    } catch (error: any) {
      setLog((l) => [...l, `Error: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">Bickford Console</h2>

      <div className="mb-3">
        <label className="block text-xs font-medium text-zinc-600">API token (stored locally)</label>
        <input
          value={token}
          onChange={(e) => {
            const v = e.target.value;
            setToken(v);
            try {
              window.localStorage.setItem("bickfordToken", v);
            } catch {}
          }}
          placeholder="BICKFORD_API_TOKEN"
          className="mt-1 w-full rounded border border-zinc-300 px-3 py-2 text-sm"
        />
      </div>
      
      <textarea
        value={intent}
        onChange={e => setIntent(e.target.value)}
        placeholder="Tell Bickford what to do…"
        rows={4}
        className="w-full rounded border border-zinc-300 p-2 font-mono text-sm focus:border-zinc-500 focus:outline-none"
        disabled={loading}
      />

      <button 
        onClick={execute}
        disabled={loading || !intent.trim()}
        className="mt-2 rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:bg-zinc-300"
      >
        {loading ? "Executing..." : "Execute"}
      </button>

      {log.length > 0 && (
        <div className="mt-4 rounded border border-zinc-200 bg-zinc-50 p-3">
          <div className="text-xs font-semibold text-zinc-600 mb-2">Execution Log</div>
          <pre className="overflow-auto text-xs text-zinc-700 whitespace-pre-wrap">
            {log.join("\n")}
          </pre>
        </div>
      )}

      {executionId ? (
        <div className="mt-4 rounded border border-zinc-200 bg-white p-3">
          <ExecutionLedger executionId={executionId} />
        </div>
      ) : null}
    </div>
  );
}
