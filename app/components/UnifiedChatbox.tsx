"use client";

import { useMemo, useState } from "react";

type Engine = "chatgpt-5.2" | "claude" | "github-copilot";

type Msg = { role: "user" | "assistant"; content: string };

export default function UnifiedChatbox() {
  const [engine, setEngine] = useState<Engine>("chatgpt-5.2");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);

  const canSend = useMemo(() => input.trim().length > 0 && !streaming, [input, streaming]);

  async function send() {
    if (!canSend) return;

    const payload = {
      engine,
      message: input,
      session: "bickford-live",
    };

    setMessages((m) => [...m, { role: "user", content: input }, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    try {
      const res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok || !res.body) {
        const text = await res.text();
        setMessages((m) => {
          const next = m.slice();
          next[next.length - 1] = { role: "assistant", content: text || "Stream failed" };
          return next;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // naive SSE parser: lines like "data: {..}\n"
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const chunk of parts) {
          const line = chunk
            .split("\n")
            .map((l) => l.trim())
            .find((l) => l.startsWith("data:"));
          if (!line) continue;

          const raw = line.replace(/^data:\s*/, "");
          if (raw === "[DONE]") continue;

          const evt = JSON.parse(raw) as { token?: string; error?: string };
          const token = evt.error ? `\n[error] ${evt.error}` : evt.token ?? "";

          setMessages((m) => {
            const next = m.slice();
            const last = next[next.length - 1];
            if (last?.role !== "assistant") return next;
            next[next.length - 1] = { ...last, content: last.content + token };
            return next;
          });
        }
      }
    } finally {
      setStreaming(false);
    }
  }

  return (
    <section className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Unified Chatbox (ALL)</h2>
        <div className="text-xs text-zinc-600">
          {streaming ? "streaming" : "idle"}
        </div>
      </div>

      <div className="flex gap-2">
        <select
          value={engine}
          onChange={(e) => setEngine(e.target.value as Engine)}
          className="rounded-md border px-2 py-1 text-sm"
        >
          <option value="chatgpt-5.2">ChatGPT 5.2</option>
          <option value="claude">Claude</option>
          <option value="github-copilot">GitHub Copilot</option>
        </select>
      </div>

      <div className="h-56 overflow-auto rounded-md border bg-zinc-50 p-2 text-sm">
        {messages.length === 0 ? (
          <div className="text-zinc-600">No messages yet.</div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className="mb-2 whitespace-pre-wrap">
              <span className="font-semibold">{m.role}:</span> {m.content}
            </div>
          ))
        )}
      </div>

      <textarea
        className="w-full min-h-24 rounded-md border p-2 text-sm"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Ask Bickford… (ledger-first)"
      />

      <button
        onClick={send}
        disabled={!canSend}
        className="inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Send
      </button>
    </section>
  );
}
