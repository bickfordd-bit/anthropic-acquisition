// components/BickfordConsole.tsx
"use client";

import { useState } from "react";

export default function BickfordConsole() {
  const [intent, setIntent] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [plan, setPlan] = useState<any>(null);

  async function planIntent() {
    const res = await fetch("/api/bickford/plan", {
      method: "POST",
      body: JSON.stringify({ intent }),
    });
    setPlan(await res.json());
  }

  async function executePlan() {
    const res = await fetch("/api/bickford/execute", {
      method: "POST",
      body: JSON.stringify({ plan }),
    });
    const out = await res.json();
    setLog(l => [...l, out.summary, out.deployUrl || ""]);
    setPlan(null);
    setIntent("");
  }

  return (
    <div>
      <h1>Bickford</h1>

      <textarea
        value={intent}
        onChange={e => setIntent(e.target.value)}
        placeholder="Tell Bickford what to do…"
        rows={4}
        style={{ width: "100%" }}
      />

      <button onClick={planIntent}>Plan</button>

      {plan && (
        <pre style={{ background: "#eee", padding: 12 }}>
          {JSON.stringify(plan, null, 2)}
          <button onClick={executePlan}>Execute</button>
        </pre>
      )}

      <pre style={{ minHeight: 200 }}>{log.join("\n")}</pre>
    </div>
  );
}
