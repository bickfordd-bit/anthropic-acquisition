import fs from "fs";
import path from "path";

function baseUrl(): string {
  const b = (process.env.BICKFORD_BASE_URL || "http://localhost:3000").trim();
  return b.replace(/\/$/, "");
}

async function waitForReady(url: string, timeoutMs: number) {
  const started = Date.now();
  // Poll /api/health until ready (or timeout).
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/health`, { headers: { Accept: "application/json" } });
      if (res.ok) {
        const data = (await res.json().catch(() => null)) as any;
        if (data?.status === "healthy") return;
      }
    } catch {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`App not ready after ${timeoutMs}ms at ${url}`);
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    // ignore
  }
  return { ok: res.ok, status: res.status, json, text };
}

async function getBinary(url: string, headers: Record<string, string>) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return { buf, headers: res.headers };
}

const demoDir = path.join(process.cwd(), "demo");
const artifactsDir = path.join(demoDir, "artifacts");
fs.mkdirSync(artifactsDir, { recursive: true });

const api = baseUrl();
const results: any[] = [];

await waitForReady(api, 30_000);

// 1) Allowed execution: ledger append
{
  const r = await postJson(`${api}/api/execute`, {
    intent: "Export the acquisition data room ZIP for audit.",
    risk: 1,
    allowedRisk: 2,
    dryRun: false,
  });
  results.push({ step: "allowed_execution", ...r });
  if (!r.ok) throw new Error(`Allowed execution failed (${r.status}): ${r.text}`);
  if (r.json?.decision !== "ALLOW") {
    throw new Error(`Expected ALLOW for allowed execution, got: ${JSON.stringify(r.json)}`);
  }
}

// 2) Canon-based denial: immutability
{
  const r = await postJson(`${api}/api/execute`, {
    intent: "delete ledger",
    risk: 5,
    allowedRisk: 2,
    dryRun: true,
  });
  results.push({ step: "canon_denial", ...r });
  if (!r.ok) throw new Error(`Expected dryRun denial response, got HTTP ${r.status}: ${r.text}`);
  if (r.json?.decision !== "DENY") {
    throw new Error(`Expected DENY for 'delete ledger', got: ${JSON.stringify(r.json)}`);
  }
}

// 3) Data-room export
{
  const token = (process.env.DATA_ROOM_TOKEN || "").trim();
  if (!token) throw new Error("DATA_ROOM_TOKEN must be set for demo export");

  const { buf, headers } = await getBinary(`${api}/api/data-room/export`, {
    Authorization: `Bearer ${token}`,
  });
  const outZip = path.join(artifactsDir, "bickford-acquisition-data-room.zip");
  fs.writeFileSync(outZip, buf);
  results.push({
    step: "data_room_export",
    ok: true,
    bytes: buf.byteLength,
    sha256: headers.get("x-content-sha256"),
    file: path.relative(process.cwd(), outZip),
  });
}

fs.writeFileSync(path.join(artifactsDir, "demo-results.json"), JSON.stringify(results, null, 2) + "\n");

// eslint-disable-next-line no-console
console.log("✅ Demo scenarios complete");
