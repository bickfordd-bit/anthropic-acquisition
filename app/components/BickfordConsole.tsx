// components/BickfordConsole.tsx
"use client";

import { useState } from "react";

export default function BickfordConsole() {
  const [intent, setIntent] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);

  async function executeIntent() {
    setLoading(true);
    setLog([]);
    try {
      setLog(l => [...l, `→ Starting execution...`]);
      
      const res = await fetch("/api/bickford/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setExecutionId(data.executionId);
        setLog(l => [
          ...l,
          `✓ Execution complete`,
          `  Summary: ${data.summary}`,
          `  Files changed: ${data.filesChanged}`,
          `  Commit: ${data.commitSha?.substring(0, 7)}`,
          data.deployUrl ? `  Deploy URL: ${data.deployUrl}` : "",
          `  Execution ID: ${data.executionId}`,
        ].filter(Boolean));
        setIntent("");
      } else {
        setLog(l => [...l, `✗ Error: ${data?.error || 'Unknown error occurred'}`]);
        if (data.executionId) {
          setExecutionId(data.executionId);
        }
      }
    } catch (error: any) {
      setLog(l => [...l, `✗ Error: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">Bickford Console</h2>
      
      <textarea
        value={intent}
        onChange={e => setIntent(e.target.value)}
        placeholder="Tell Bickford what to do…"
        rows={4}
        className="w-full rounded border border-zinc-300 p-2 font-mono text-sm focus:border-zinc-500 focus:outline-none"
        disabled={loading}
      />

      <button 
        onClick={executeIntent}
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
      
      {executionId && (
        <div className="mt-2 text-xs text-zinc-500">
          <a 
            href={`/api/bickford/ledger/${executionId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            View full execution ledger →
          </a>
        </div>
      )}
    </div>
  );
}
