"use client";

import { useEffect, useState } from "react";
import ExecutionForm from "@/app/components/ExecutionForm";
import LastExecutionBanner from "@/app/components/LastExecutionBanner";
import LedgerView from "@/app/components/LedgerView";
import SystemBadge from "@/app/components/SystemBadge";

type KernelResult = {
  intent: string;
  decision: "ALLOW" | "DENY";
  rationale: string;
  actor?: string;
  systemInitiated?: boolean;
  ledgerHash?: string;
  prevHash?: string | null;
  createdAt?: string;
  entryId?: string;
};

type LedgerEntry = {
  id: string;
  type: string;
  content: unknown;
  prevHash?: string | null;
  hash: string;
  createdAt: string;
};

export default function BickfordKernel() {
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<KernelResult | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function refresh() {
    try {
      setLoadError(null);
      const res = await fetch("/api/execute?take=20", { cache: "no-store" });
      const contentType = res.headers.get("content-type") ?? "";

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Request failed (${res.status})`);
      }

      if (!contentType.toLowerCase().includes("application/json")) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Expected JSON response");
      }

      const data = (await res.json().catch(() => ({}))) as any;
      setEntries(Array.isArray(data?.entries) ? (data.entries as LedgerEntry[]) : []);
      setLast(data?.last ?? null);
    } catch (e: any) {
      setEntries([]);
      setLast(null);
      setLoadError(String(e?.message ?? e));
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function executeIntent(intent: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent }),
      });

      const data = (await res.json().catch(() => ({}))) as KernelResult;
      if (res.ok) {
        setLast(data);
        await refresh();
        return true;
      }

      setLast(
        (data && typeof data === "object" && "decision" in data
          ? data
          : {
              intent,
              decision: "DENY",
              rationale: "Execution failed",
            }) as KernelResult,
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="font-semibold">Bickford Kernel</h2>
          <div className="text-xs text-zinc-600">Intent → Canon Check → Ledger Append → Recall</div>
        </div>
        <SystemBadge />
      </div>

      <LastExecutionBanner last={last} />

      {loadError ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800 whitespace-pre-wrap">
          {loadError}
        </div>
      ) : null}

      <ExecutionForm variant="intent" onExecute={executeIntent} busy={busy} />

      <div>
        <div className="mb-2 text-sm font-medium">Recent executions</div>
        <LedgerView entries={entries} />
      </div>
    </section>
  );
}
