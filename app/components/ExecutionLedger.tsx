// components/ExecutionLedger.tsx
"use client";

import { useState, useEffect } from "react";

interface LedgerEvent {
  type: string;
  executionId: string;
  timestamp: string;
  [key: string]: any;
}

interface ExecutionLedgerProps {
  executionId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export default function ExecutionLedger({
  executionId,
  autoRefresh = false,
  refreshInterval = 5000,
}: ExecutionLedgerProps) {
  const [events, setEvents] = useState<LedgerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      const res = await fetch(`/api/bickford/ledger/${executionId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${res.statusText}`);
      }
      const data = await res.json();
      setEvents(data.events || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();

    if (autoRefresh) {
      const interval = setInterval(fetchEvents, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [executionId, autoRefresh, refreshInterval]);

  if (loading) {
    return (
      <div className="rounded border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="text-sm text-zinc-500">Loading execution ledger...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded border border-red-200 bg-red-50 p-4 shadow-sm">
        <div className="text-sm text-red-600">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="rounded border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Execution Ledger</h3>
        <button
          onClick={fetchEvents}
          className="text-xs text-blue-600 hover:underline"
        >
          Refresh
        </button>
      </div>

      <div className="mb-2 text-xs text-zinc-500">
        Execution ID: <span className="font-mono">{executionId}</span>
      </div>

      {events.length === 0 ? (
        <div className="text-sm text-zinc-500">No events found</div>
      ) : (
        <div className="space-y-3">
          {events.map((event, idx) => (
            <EventCard key={idx} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: LedgerEvent }) {
  const [expanded, setExpanded] = useState(false);

  const getEventIcon = (type: string) => {
    switch (type) {
      case "EXECUTION_STARTED":
        return "▶";
      case "PLAN_GENERATED":
        return "📋";
      case "FILES_APPLIED":
        return "📝";
      case "DEPLOY_TRIGGERED":
        return "🚀";
      case "DEPLOY_COMPLETE":
        return "✓";
      case "ROLLBACK_EXECUTED":
        return "↩";
      default:
        return "•";
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "EXECUTION_STARTED":
        return "text-blue-600";
      case "PLAN_GENERATED":
        return "text-purple-600";
      case "FILES_APPLIED":
        return "text-green-600";
      case "DEPLOY_TRIGGERED":
        return "text-orange-600";
      case "DEPLOY_COMPLETE":
        return "text-green-700";
      case "ROLLBACK_EXECUTED":
        return "text-red-600";
      default:
        return "text-zinc-600";
    }
  };

  return (
    <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
      <div
        className="flex cursor-pointer items-start justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-sm ${getEventColor(event.type)}`}>
              {getEventIcon(event.type)}
            </span>
            <span className="text-sm font-medium">{event.type}</span>
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            {new Date(event.timestamp).toLocaleString()}
          </div>
        </div>
        <button className="text-xs text-zinc-400 hover:text-zinc-600">
          {expanded ? "▲" : "▼"}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 border-t border-zinc-200 pt-3">
          <pre className="overflow-auto whitespace-pre-wrap text-xs text-zinc-700">
            {JSON.stringify(event, null, 2)}
          </pre>

          {event.diff && (
            <div className="mt-2">
              <div className="text-xs font-semibold text-zinc-600">Diff:</div>
              <pre className="mt-1 overflow-auto whitespace-pre-wrap rounded bg-zinc-100 p-2 text-xs">
                {event.diff}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
