import type { ReactNode } from "react";

export const runtime = "nodejs";

const CONFIGURE_ENV_SNIPPET = String.raw`export DATA_ROOM_TOKEN="$(openssl rand -hex 32)"
export BICKFORD_API_TOKEN="$(openssl rand -hex 32)"

cat > .env.local << 'EOF'
DATA_ROOM_TOKEN=__REPLACE__
BICKFORD_API_TOKEN=__REPLACE_API__
BICKFORD_PUBLIC_API=false
DATABASE_URL=file:./dev.db
DEMO_MODE=false
EOF

sed -i "s/__REPLACE__/$DATA_ROOM_TOKEN/" .env.local
sed -i "s/__REPLACE_API__/$BICKFORD_API_TOKEN/" .env.local`;

const START_APP_SNIPPET = String.raw`pnpm install
pnpm run prisma:migrate
pnpm run dev

# open
# http://localhost:3000`;

const HEALTH_AUTH_SNIPPET = String.raw`curl -sS http://localhost:3000/api/health

# authenticated compute route
curl -sS -X POST http://localhost:3000/api/optr/score \
  -H "Authorization: Bearer $BICKFORD_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"risk": 10, "allowedRisk": 3}'`;

const EXECUTE_DENY_SNIPPET = String.raw`curl -sS -X POST http://localhost:3000/api/execute \
  -H "Authorization: Bearer $BICKFORD_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Propose an action that should be denied by canon/OPTR","useClaudeIntent":false}'`;

const EXPORT_VERIFY_SNIPPET = String.raw`curl -sS http://localhost:3000/api/data-room/export \
  -H "Authorization: Bearer $DATA_ROOM_TOKEN" \
  --output data-room.zip

unzip -q data-room.zip -d /tmp/data-room
DATA_ROOM_OUT=/tmp/data-room pnpm run data-room:verify`;

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-2 overflow-auto rounded-lg border border-white/10 bg-black/40 p-3 text-xs text-neutral-200">
      <code>{children}</code>
    </pre>
  );
}

function Step({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-2 text-sm text-neutral-300">{children}</div>
    </div>
  );
}

export default function Page() {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">10-minute Buyer Demo</h1>
          <p className="text-sm text-neutral-400">
            Goal: show authority gating, provenance, and verifiable export — fast.
          </p>
        </div>

        <Step title="1) Configure local env">
          <div>
            Create <span className="font-mono">.env.local</span> (Next.js loads it automatically):
            <CodeBlock>{CONFIGURE_ENV_SNIPPET}</CodeBlock>
          </div>
        </Step>

        <Step title="2) Start the app">
          <CodeBlock>{START_APP_SNIPPET}</CodeBlock>
        </Step>

        <Step title="3) Health + auth sanity">
          <CodeBlock>{HEALTH_AUTH_SNIPPET}</CodeBlock>
        </Step>

        <Step title="4) Execute + show deny path recorded">
          <CodeBlock>{EXECUTE_DENY_SNIPPET}</CodeBlock>
          <div className="mt-2 text-xs text-neutral-400">
            Tip: open <span className="font-mono">/executive</span> to show the live ledger decisions.
          </div>
        </Step>

        <Step title="5) Export data room + verify offline">
          <CodeBlock>{EXPORT_VERIFY_SNIPPET}</CodeBlock>
          <div className="mt-2 text-xs text-neutral-400">If verification fails, the export is invalid.</div>
        </Step>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-neutral-300">
          Next: for buyer diligence docs, see <span className="font-mono">/DILIGENCE.md</span>,{" "}
          <span className="font-mono">/ARCHITECTURE.md</span>, and <span className="font-mono">/SECURITY.md</span>.
        </div>
      </div>
    </main>
  );
}
