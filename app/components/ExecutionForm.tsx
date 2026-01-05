"use client";

import { useEffect, useMemo, useState } from "react";

type GateResult = null | {
  decision: "ALLOW" | "DENY";
  rationale: string;
};

type ClaudePromptProps = {
  variant?: "claudePrompt";
  onExecute: (prompt: string, viaClaude: boolean) => Promise<boolean>;
  busy?: boolean;
};

type IntentProps = {
  variant: "intent";
  onExecute: (intent: string) => Promise<boolean>;
  busy?: boolean;
};

export default function ExecutionForm({
  onExecute,
  busy,
  variant,
}: ClaudePromptProps | IntentProps) {
  const isIntent = variant === "intent";

  const [prompt, setPrompt] = useState("");
  const [viaClaude, setViaClaude] = useState(true);
  const [gate, setGate] = useState<GateResult>(null);
  const [gateBusy, setGateBusy] = useState(false);

  const canRun = useMemo(() => {
    if (busy) return false;
    if (isIntent) {
      if (prompt.trim().length === 0) return false;
      if (gateBusy) return false;
      if (gate?.decision === "DENY") return false;
      return true;
    }
    return prompt.trim().length > 0;
  }, [busy, gate?.decision, gateBusy, isIntent, prompt]);

  useEffect(() => {
    if (!isIntent) return;
    const intent = prompt.trim();
    if (!intent) {
      setGate(null);
      return;
    }

    let cancelled = false;
    const t = setTimeout(async () => {
      setGateBusy(true);
      try {
        const res = await fetch("/api/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intent, dryRun: true }),
        });
        const data = (await res.json().catch(() => ({}))) as any;
        if (cancelled) return;
        if (typeof data?.decision === "string" && typeof data?.rationale === "string") {
          setGate({
            decision: data.decision === "DENY" ? "DENY" : "ALLOW",
            rationale: data.rationale,
          });
        } else {
          setGate(null);
        }
      } finally {
        if (!cancelled) setGateBusy(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [isIntent, prompt]);

  return (
    <div className="space-y-3">
      {!isIntent ? (
        <label className="flex items-center gap-2 text-xs text-zinc-600">
          <input
            type="checkbox"
            checked={viaClaude}
            onChange={() => setViaClaude(!viaClaude)}
          />
          Generate intent via Claude
        </label>
      ) : null}

      <textarea
        className="w-full min-h-28 rounded-md border p-2 text-sm"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={isIntent ? "Declare intent…" : "Describe what you want to do…"}
      />

      {isIntent ? (
        <div className="rounded-md border bg-white p-3 text-xs text-zinc-700">
          <div className="flex items-center justify-between">
            <div className="font-medium">Pre-execution gate</div>
            <div className="text-zinc-500">{gateBusy ? "checking" : "ready"}</div>
          </div>
          {gate ? (
            <div className="mt-2 space-y-1">
              <div>
                <strong>Decision:</strong> {gate.decision}
              </div>
              <div>
                <strong>Rationale:</strong> {gate.rationale}
              </div>
            </div>
          ) : (
            <div className="mt-2 text-zinc-500">Type intent to evaluate.</div>
          )}
        </div>
      ) : null}

      <button
        className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        disabled={!canRun}
        onClick={async () => {
          const ok = isIntent
            ? await (onExecute as IntentProps["onExecute"])(prompt.trim())
            : await (onExecute as ClaudePromptProps["onExecute"])(prompt, viaClaude);
          if (ok) setPrompt("");
        }}
      >
        {busy ? "Executing…" : isIntent ? "Execute Intent" : "Execute"}
      </button>
    </div>
  );
}
