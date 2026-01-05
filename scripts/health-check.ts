const explicitUrl = (process.env.HEALTHCHECK_URL || "").trim() || null;
const base = (process.env.BICKFORD_BASE_URL || "").trim() || null;

if (!explicitUrl && !base) {
  // eslint-disable-next-line no-console
  console.error(
    "❌ Missing configuration: set HEALTHCHECK_URL (full URL) or BICKFORD_BASE_URL (e.g. https://your-app) to run health checks.",
  );
  process.exitCode = 1;
  throw new Error("Missing HEALTHCHECK_URL/BICKFORD_BASE_URL");
}

const url = explicitUrl ?? `${(base as string).replace(/\/$/, "")}/api/health`;

const timeoutMs = Math.max(1000, Number(process.env.HEALTHCHECK_TIMEOUT_MS ?? 8000) || 8000);

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);

try {
  const res = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Health check failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json().catch(() => null)) as any;
  if (!data || data.status !== "healthy") {
    throw new Error(`Unhealthy response: ${JSON.stringify(data)}`);
  }

  // eslint-disable-next-line no-console
  console.log("✅ System healthy", { url, commit: data.commit ?? null });
} catch (err: any) {
  // eslint-disable-next-line no-console
  console.error("❌ System unhealthy", { url, error: err?.message ?? String(err) });
  process.exitCode = 1;
} finally {
  clearTimeout(timer);
}
