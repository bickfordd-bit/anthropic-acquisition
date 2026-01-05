import fs from "fs";
import os from "os";
import path from "path";
import { execFileSync } from "child_process";

function requireEnv(name: string): string | null {
  const v = (process.env[name] ?? "").trim();
  return v.length ? v : null;
}

async function fetchWithTimeout(url: string, timeoutMs: number, headers: Record<string, string>) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, headers });
  } finally {
    clearTimeout(timer);
  }
}

function unzip(zipPath: string, outDir: string) {
  try {
    execFileSync("unzip", ["-q", zipPath, "-d", outDir], { stdio: "inherit" });
  } catch (err) {
    throw new Error(
      "Failed to unzip export. Ensure `unzip` is available on PATH (GitHub runners include it by default)."
    );
  }
}

async function main() {
  const requireRemote = (process.env.REQUIRE_REMOTE ?? "").trim().toLowerCase() === "true";

  const baseUrl = requireEnv("BICKFORD_BASE_URL");
  const token = requireEnv("DATA_ROOM_TOKEN");

  if (!baseUrl || !token) {
    const msg = "Skipping remote data-room verification (missing BICKFORD_BASE_URL or DATA_ROOM_TOKEN).";
    if (requireRemote) throw new Error(msg);
    // eslint-disable-next-line no-console
    console.log("ℹ️", msg);
    return;
  }

  const url = `${baseUrl.replace(/\/$/, "")}/api/data-room/export`;
  const timeoutMs = Math.max(5_000, Number(process.env.REMOTE_EXPORT_TIMEOUT_MS ?? 45_000) || 45_000);

  // eslint-disable-next-line no-console
  console.log("⬇️ Downloading deployed data-room export", { url, timeoutMs });

  const res = await fetchWithTimeout(url, timeoutMs, {
    Authorization: `Bearer ${token}`,
    Accept: "application/zip",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Remote export failed: ${res.status} ${res.statusText}${text ? `\n${text}` : ""}`);
  }

  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "bickford-data-room-"));
  const zipPath = path.join(tmpRoot, "data-room.zip");
  const outDir = path.join(tmpRoot, "out");

  try {
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.promises.writeFile(zipPath, buf);
    await fs.promises.mkdir(outDir, { recursive: true });

    unzip(zipPath, outDir);

    // Reuse the deterministic verifier.
    process.env.DATA_ROOM_OUT = outDir;
    await import("./verifyDataRoom");

    if (process.exitCode && process.exitCode !== 0) {
      process.exit(process.exitCode);
    }

    // eslint-disable-next-line no-console
    console.log("✅ Remote data-room export verified");
  } finally {
    await fs.promises.rm(tmpRoot, { recursive: true, force: true });
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("❌ Remote data-room verification failed\n" + (err?.stack ?? String(err)));
  process.exitCode = 1;
});
