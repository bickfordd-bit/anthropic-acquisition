import fs from "node:fs";
import path from "node:path";
import { chromium, type Page } from "playwright";

function env(name: string): string | null {
  const v = (process.env[name] ?? "").trim();
  return v.length ? v : null;
}

function baseUrl(): string {
  const b = env("BICKFORD_DEMO_URL") ?? env("DEMO_URL") ?? env("BICKFORD_BASE_URL") ?? "http://localhost:3000";
  return b.replace(/\/$/, "");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function safeGoto(page: Page, url: string) {
  try {
    const res = await page.goto(url, { waitUntil: "networkidle" });
    return res?.ok() ?? false;
  } catch {
    return false;
  }
}

async function waitForHealth(root: string, timeoutMs: number) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${root}/api/health`, { headers: { Accept: "application/json" } });
      if (res.ok) return;
    } catch {
      // ignore
    }
    await sleep(500);
  }
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function durationForScript(script: string): number {
  // ~140 wpm-ish, bounded.
  const words = script.split(/\s+/).filter(Boolean).length;
  const ms = Math.ceil((words / 2.3) * 1000);
  return Math.min(25_000, Math.max(6_000, ms));
}

export async function recordDemo(script: string, opts?: { executionId?: string }): Promise<string> {
  const root = baseUrl();
  await waitForHealth(root, 15_000).catch(() => null);

  const demoDir = path.join(process.cwd(), "demo", "autodemo");
  const videosDir = path.join(demoDir, "videos");
  fs.mkdirSync(videosDir, { recursive: true });

  const headful = (env("DEMO_HEADFUL") ?? "").toLowerCase() === "true";
  const browser = await chromium.launch({ headless: !headful });
  const context = await browser.newContext({
    recordVideo: { dir: videosDir, size: { width: 1920, height: 1080 } },
    viewport: { width: 1920, height: 1080 },
  });

  let videoPath: string | null = null;
  const page = await context.newPage();
  const video = page.video();

  try {
    const ok = await safeGoto(page, root);

    const overlayHtml = `
      <div id="bickford-autodemo" style="
        position:fixed;inset:24px auto auto 24px;z-index:2147483647;
        width:720px;max-width:calc(100vw - 48px);
        background:rgba(10,10,10,0.88);color:#f5f5f5;border:1px solid rgba(255,255,255,0.16);
        border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,0.45);
        padding:18px 18px 14px 18px;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;
      ">
        <div style="font-weight:700;letter-spacing:0.2px;margin-bottom:10px;">Bickford — Autonomous Demo (Ledger Derived)</div>
        <pre style="margin:0;white-space:pre-wrap;word-break:break-word;font-size:14px;line-height:1.35;">${escapeHtml(
          script,
        )}</pre>
      </div>
    `;

    if (ok) {
      await page.evaluate((html) => {
        const el = document.createElement("div");
        el.innerHTML = html;
        document.body.appendChild(el);
      }, overlayHtml);
    } else {
      await page.setContent(`<!doctype html><html><body style="margin:0;background:#0b0b0b;">${overlayHtml}</body></html>`, {
        waitUntil: "load",
      });
    }

    await page.waitForTimeout(durationForScript(script));
  } finally {
    await page.close().catch(() => null);
    await context.close().catch(() => null);

    if (video) {
      const p = await video.path().catch(() => null);
      if (p) videoPath = p;
    }

    await browser.close().catch(() => null);
  }

  if (!videoPath) {
    throw new Error("Playwright did not produce a video file");
  }

  // Move to a stable name for downstream publish steps.
  const stamp = Date.now();
  const safeExec = (opts?.executionId ?? "unknown").replaceAll(/[^a-zA-Z0-9_-]/g, "_");
  const out = path.join(videosDir, `demo-${safeExec}-${stamp}.webm`);
  if (path.resolve(out) !== path.resolve(videoPath)) {
    try {
      fs.renameSync(videoPath, out);
    } catch {
      fs.copyFileSync(videoPath, out);
    }
  }

  return out;
}
