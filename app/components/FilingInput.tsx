"use client";

import { useMemo, useState } from "react";
import ExecutionForm from "@/app/components/ExecutionForm";
import LastExecutionBanner from "@/app/components/LastExecutionBanner";

export default function FilingInput() {
  const [risk, setRisk] = useState(1);
  const [allowedRisk, setAllowedRisk] = useState(2);
  const [busy, setBusy] = useState(false);

  const [last, setLast] = useState<null | {
    admissible: boolean;
    intent?: string;
    reason?: string;
    why?: string;
    decision?: "ALLOW" | "DENY";
    score?: string;
    viaClaude?: boolean;
    systemInitiated?: boolean;
    ledgerHash?: string;
    executionLedgerHash?: string;
    canon?: string;
    rationale?: string;
  }>(null);

  const canSubmit = useMemo(() => !busy, [busy]);

  async function submit(prompt: string, viaClaude: boolean) {
    if (!canSubmit) return false;

    setBusy(true);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, viaClaude, risk, allowedRisk }),
      });

      const data = await res.json().catch(() => ({}));
      setLast(data);

      if (!res.ok) {
        alert(String(data?.reason ?? data?.error ?? "Denied"));
        return false;
      }

      return true;
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">File Intent → Ledger → Canon</h2>
        <div className="text-xs text-zinc-600">Execution = Law</div>
      </div>

      <LastExecutionBanner last={last} />

      <ExecutionForm onExecute={submit} busy={busy} />

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-xs text-zinc-600">
          Risk
          <input
            className="w-full rounded-md border p-2 text-sm"
            type="number"
            value={risk}
            onChange={(e) => setRisk(Number(e.target.value))}
          />
        </label>
        <label className="space-y-1 text-xs text-zinc-600">
          Allowed Risk
          <input
            className="w-full rounded-md border p-2 text-sm"
            type="number"
            value={allowedRisk}
            onChange={(e) => setAllowedRisk(Number(e.target.value))}
          />
        </label>
      </div>
    </section>
  );
}
