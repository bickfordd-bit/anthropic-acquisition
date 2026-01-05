"use client";

import { useCallback, useMemo, useState } from "react";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export default function DataRoomExportButton() {
  const [busyZip, setBusyZip] = useState(false);
  const [busyPdf, setBusyPdf] = useState(false);
  const [lastSha, setLastSha] = useState<string | null>(null);
  const [lastPdfSha, setLastPdfSha] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tokenKey = "bickford.dataRoomToken";

  const zipLabel = useMemo(() => (busyZip ? "Exporting…" : "Export Data Room (ZIP)"), [busyZip]);
  const pdfLabel = useMemo(() => (busyPdf ? "Generating…" : "Audit Pack (PDF)"), [busyPdf]);

  const getToken = useCallback(() => {
    let token = window.localStorage.getItem(tokenKey) ?? "";
    if (!token) {
      token = window.prompt("Enter DATA_ROOM_TOKEN")?.trim() ?? "";
      if (!token) return null;
      window.localStorage.setItem(tokenKey, token);
    }
    return token;
  }, []);

  const onExport = useCallback(async () => {
    setError(null);
    setLastSha(null);
    setLastPdfSha(null);

    const token = getToken();
    if (!token) return;

    setBusyZip(true);
    try {
      const res = await fetch("/api/data-room/export", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Export failed (${res.status})`);
      }

      const sha = res.headers.get("x-content-sha256");
      if (sha) setLastSha(sha);

      const blob = await res.blob();
      downloadBlob(blob, "bickford-acquisition-data-room.zip");
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (/unauthorized/i.test(msg)) {
        window.localStorage.removeItem(tokenKey);
      }
      setError(msg);
    } finally {
      setBusyZip(false);
    }
  }, [getToken]);

  const onAuditPdf = useCallback(async () => {
    setError(null);
    setLastPdfSha(null);

    const token = getToken();
    if (!token) return;

    setBusyPdf(true);
    try {
      const res = await fetch("/api/audit/pdf", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Audit PDF failed (${res.status})`);
      }

      const sha = res.headers.get("x-content-sha256");
      if (sha) setLastPdfSha(sha);

      const blob = await res.blob();
      downloadBlob(blob, "bickford-audit-pack.pdf");
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (/unauthorized/i.test(msg)) {
        window.localStorage.removeItem(tokenKey);
      }
      setError(msg);
    } finally {
      setBusyPdf(false);
    }
  }, [getToken]);

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Acquisition Data Room</h2>
          <p className="text-xs text-zinc-600">Streams a deterministic ZIP export + checksum.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onAuditPdf}
            disabled={busyPdf}
            className="inline-flex items-center justify-center rounded-md border bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {pdfLabel}
          </button>
          <button
            onClick={onExport}
            disabled={busyZip}
            className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {zipLabel}
          </button>
        </div>
      </div>

      {lastSha ? (
        <div className="text-xs text-zinc-700">
          <span className="font-semibold">sha256:</span> {lastSha}
        </div>
      ) : null}

      {lastPdfSha ? (
        <div className="text-xs text-zinc-700">
          <span className="font-semibold">pdf sha256:</span> {lastPdfSha}
        </div>
      ) : null}

      {error ? <div className="text-xs text-red-700 whitespace-pre-wrap">{error}</div> : null}

      <div className="text-xs text-zinc-600">
        Server must set <span className="font-mono">DATA_ROOM_TOKEN</span>. Token is stored in localStorage.
      </div>
    </div>
  );
}
