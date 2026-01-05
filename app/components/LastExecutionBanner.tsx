export default function LastExecutionBanner({
  last,
}: {
  last:
    | null
    | {
        admissible: boolean;
        decision?: "ALLOW" | "DENY";
        intent?: string;
        reason?: string;
        why?: string;
        score?: string;
        viaClaude?: boolean;
        systemInitiated?: boolean;
        ledgerHash?: string;
        executionLedgerHash?: string;
        canon?: string;
      }
    | {
        intent: string;
        decision: "ALLOW" | "DENY";
        rationale: string;
        why?: string;
        canon?: string;
        intentHash?: string;
        nonInterference?: boolean;
        nonInterferenceReason?: string | null;
        optr?: unknown;
        actor?: string;
        systemInitiated?: boolean;
        ledgerHash?: string;
        prevHash?: string | null;
        createdAt?: string | Date;
      };
}) {
  if (!last) return null;

  const isOptr = "admissible" in last;

  const systemInitiated = (last as any).systemInitiated === true;
  const ledgerHash = (last as any).executionLedgerHash ?? (last as any).ledgerHash;
  const why = (last as any).why ?? (last as any).reason ?? (last as any).rationale;

  return (
    <div className="rounded-md border bg-white p-3 text-sm">
      {isOptr ? (
        <>
          <div>
            <strong>Decision:</strong> {last.decision ?? (last.admissible ? "ALLOW" : "DENY")}
            {systemInitiated ? (
              <span className="ml-2 rounded-full bg-black px-2 py-0.5 text-xs text-white">
                System-Initiated Execution
              </span>
            ) : null}
          </div>
          {why ? (
            <div>
              <strong>Why:</strong> {why}
            </div>
          ) : null}
          {(last as any).canon ? (
            <div>
              <strong>Canon:</strong> {(last as any).canon}
            </div>
          ) : null}
          {last.score ? (
            <div>
              <strong>Score:</strong> {last.score}
            </div>
          ) : null}
          <div>
            <strong>Origin:</strong> {last.viaClaude ? "Claude (Reasoning Only)" : "Direct"}
          </div>
          {ledgerHash ? (
            <div className="mt-2 space-y-1 text-xs text-zinc-600">
              <div className="break-all">
                <strong>hash:</strong> {ledgerHash}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <div>
              <strong>Decision:</strong> {last.decision}
            </div>
            {systemInitiated ? (
              <div className="text-xs text-zinc-600">system-initiated</div>
            ) : null}
          </div>

          <div className="mt-1">
            <strong>Why I acted:</strong> {why}
          </div>

          {last.canon ? (
            <div className="mt-1">
              <strong>Canon:</strong> {last.canon}
            </div>
          ) : null}

          {last.ledgerHash ? (
            <div className="mt-2 space-y-1 text-xs text-zinc-600">
              <div className="break-all">
                <strong>hash:</strong> {last.ledgerHash}
              </div>
              <div className="break-all">
                <strong>prev:</strong> {last.prevHash ?? "(genesis)"}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
