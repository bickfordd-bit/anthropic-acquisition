// components/BickfordConsole.tsx
"use client";

import { useState } from "react";

export default function BickfordConsole() {
  const [intent, setIntent] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function planIntent() {
    setLoading(true);
    try {
      const res = await fetch("/api/bickford/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent }),
      });
      const data = await res.json();
      if (res.ok) {
        setPlan(data);
      } else {
        setLog(l => [...l, `Error: ${data.error}`]);
      }
    } catch (error: any) {
      setLog(l => [...l, `Error: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  }

  async function executePlan() {
    setLoading(true);
    try {
      const res = await fetch("/api/bickford/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const out = await res.json();
      if (res.ok) {
        setLog(l => [...l, `✓ ${out.summary}`, out.deployUrl ? `→ ${out.deployUrl}` : ""]);
        setPlan(null);
        setIntent("");
      } else {
        setLog(l => [...l, `Error: ${out.error}`]);
      }
    } catch (error: any) {
      setLog(l => [...l, `Error: ${error.message}`]);
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
        onClick={planIntent}
        disabled={loading || !intent.trim()}
        className="mt-2 rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:bg-zinc-300"
      >
        {loading ? "Planning..." : "Plan"}
      </button>

      {plan && (
        <div className="mt-4 rounded border border-zinc-300 bg-zinc-50 p-3">
          <pre className="mb-3 overflow-auto text-xs">
            {JSON.stringify(plan, null, 2)}
          </pre>
          <button 
            onClick={executePlan}
            disabled={loading}
            className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:bg-zinc-300"
          >
            {loading ? "Executing..." : "Execute"}
          </button>
        </div>
      )}

      {log.length > 0 && (
        <div className="mt-4 rounded border border-zinc-200 bg-zinc-50 p-3">
          <div className="text-xs font-semibold text-zinc-600 mb-2">Execution Log</div>
          <pre className="overflow-auto text-xs text-zinc-700 whitespace-pre-wrap">
            {log.join("\n")}
          </pre>
        </div>
      )}
    </div>
  );
}
