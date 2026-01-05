"use client";

type LedgerEntry = {
  id: string;
  type: string;
  content: unknown;
  prevHash?: string | null;
  hash: string;
  createdAt: string;
};

export default function LedgerView({ entries }: { entries: LedgerEntry[] }) {
  return (
    <div className="rounded-md border bg-white">
      <ul className="divide-y">
        {entries.map((e) => (
          <li key={e.id} className="p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="font-medium">{e.type}</div>
              <div className="text-xs text-zinc-500">
                {new Date(e.createdAt).toLocaleString()}
              </div>
            </div>
            <pre className="mt-2 overflow-auto rounded bg-zinc-50 p-2 text-xs">
{JSON.stringify(e.content, null, 2)}
            </pre>
            <div className="mt-2 space-y-1 text-xs text-zinc-600 break-all">
              <div>hash: {e.hash}</div>
              <div>prev: {e.prevHash ?? "(genesis)"}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
