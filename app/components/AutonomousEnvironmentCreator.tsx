"use client";

import { useMemo, useState } from "react";

type ApiResult =
  | {
      success: true;
      intentId: string;
      mode: "plan" | "execute";
      environmentPath?: string;
      deploymentUrl?: string;
      actions?: Array<{ step: string; command?: string }>;
      message?: string;
    }
  | {
      success?: false;
      error?: string;
      detail?: string;
      hint?: string;
      intentId?: string;
    };

export default function AutonomousEnvironmentCreator() {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"plan" | "execute">("plan");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResult | null>(null);

  const canSubmit = useMemo(() => prompt.trim().length > 0 && !loading, [prompt, loading]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/intent/autonomous-env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, mode }),
      });

      const data = (await res.json()) as ApiResult;
      setResult(data);
    } catch {
      setResult({ success: false, error: "Request failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Autonomous Environment Creator</h2>
        <p className="text-sm text-zinc-600">
          Submit an intent and get back a plan (default) or run execute mode if enabled server-side.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Example: Create a HIPAA-compliant telehealth platform with audit trails, deploy to Netlify"
          rows={4}
          disabled={loading}
          className="w-full rounded-lg border border-zinc-300 p-3 text-sm outline-none focus:border-zinc-400"
        />

        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={mode === "execute"}
              onChange={(e) => setMode(e.target.checked ? "execute" : "plan")}
              disabled={loading}
            />
            Execute (requires server enable)
          </label>

          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Working…" : mode === "execute" ? "Create" : "Generate Plan"}
          </button>
        </div>
      </form>

      {result && (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm">
          {"success" in result && result.success ? (
            <div className="space-y-2">
              <div className="font-semibold">{result.message ?? "Success"}</div>
              <div className="text-zinc-700">Intent: {result.intentId}</div>
              {result.environmentPath && <div className="text-zinc-700">Path: {result.environmentPath}</div>}
              {result.deploymentUrl && (
                <div className="text-zinc-700">
                  URL:{" "}
                  <a className="underline" href={result.deploymentUrl} target="_blank" rel="noreferrer">
                    {result.deploymentUrl}
                  </a>
                </div>
              )}

              {result.actions && result.actions.length > 0 && (
                <div className="space-y-1">
                  <div className="font-semibold">Actions</div>
                  <ul className="list-disc pl-5 text-zinc-700">
                    {result.actions.map((a, idx) => (
                      <li key={idx}>
                        {a.step}
                        {a.command ? `: ${a.command}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="font-semibold text-red-700">Failed</div>
              {result.error && <div className="text-zinc-700">{result.error}</div>}
              {result.detail && <div className="text-zinc-700">{result.detail}</div>}
              {result.hint && <div className="text-zinc-700">{result.hint}</div>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
