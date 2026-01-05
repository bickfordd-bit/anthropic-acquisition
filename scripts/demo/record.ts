import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { chromium, type Page } from "playwright";

function env(name: string): string | null {
  const v = (process.env[name] ?? "").trim();
  return v.length ? v : null;
}

function baseUrl(): string {
  const b = env("DEMO_URL") ?? env("BICKFORD_BASE_URL") ?? "http://localhost:3000";
  return b.replace(/\/$/, "");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function listWebmFilesRecursive(dir: string): string[] {
  const out: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listWebmFilesRecursive(p));
    else if (e.isFile() && p.toLowerCase().endsWith(".webm")) out.push(p);
  }
  return out;
}

async function safeGoto(page: Page, url: string) {
  try {
    const res = await page.goto(url, { waitUntil: "networkidle" });
    return res?.ok() ?? false;
  } catch {
    return false;
  }
}

async function screenshot(page: Page, screenshotsDir: string, filename: string) {
  await page.screenshot({ path: path.join(screenshotsDir, filename), fullPage: true });
}

async function tryExpandDetails(page: Page, screenshotsDir: string) {
  const details = page.locator("details");
  const count = await details.count();
  for (let i = 0; i < Math.min(count, 3); i++) {
    await details.nth(i).click().catch(() => null);
    await sleep(800);
    await screenshot(page, screenshotsDir, `05-detail-${i + 1}.png`);
  }
}

const demoDir = path.join(process.cwd(), "demo");
const videosDir = path.join(demoDir, "videos");
const screenshotsDir = path.join(demoDir, "screenshots");
fs.mkdirSync(videosDir, { recursive: true });
fs.mkdirSync(screenshotsDir, { recursive: true });

const headful = (env("DEMO_HEADFUL") ?? "").toLowerCase() === "true";
const browser = await chromium.launch({ headless: !headful });
const context = await browser.newContext({
  recordVideo: { dir: videosDir, size: { width: 1920, height: 1080 } },
  viewport: { width: 1920, height: 1080 },
});

try {
  const page = await context.newPage();
  const root = baseUrl();

  // 1) Homepage
  await safeGoto(page, root);
  await sleep(1500);
  await screenshot(page, screenshotsDir, "01-homepage.png");

  // 2) Executive dashboard (best-effort)
  const okExecutive = await safeGoto(page, `${root}/executive`);
  if (okExecutive) {
    await sleep(2500);
    await screenshot(page, screenshotsDir, "02-executive-dashboard.png");
  }

  // 3) Filing interface (best-effort)
  await safeGoto(page, root);
  await sleep(1000);

  const promptInput = page.locator("textarea").first();
  if (await promptInput.count()) {
    await promptInput.fill("Analyze market opportunity for AI execution authority in healthcare").catch(() => null);
    await sleep(600);
    await screenshot(page, screenshotsDir, "03-filing-prompt.png");

    const submit = page
      .getByRole("button")
      .filter({ hasText: /execute|submit|file/i })
      .first();
    if (await submit.count()) {
      await submit.click().catch(() => null);
      await sleep(3500);
      await screenshot(page, screenshotsDir, "04-execution-result.png");
    }
  }

  // 4) Interactive details
  await safeGoto(page, root);
  await sleep(1000);
  await tryExpandDetails(page, screenshotsDir);
} finally {
  // Closing the context flushes the recorded video.
  await context.close();
  await browser.close();
}

// Find the newest video file and rename it to a stable filename.
const webms = listWebmFilesRecursive(videosDir);
if (webms.length) {
  const newest = webms
    .map((p) => ({ p, mtimeMs: fs.statSync(p).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0]!.p;
  const stableWebm = path.join(videosDir, "demo-recording.webm");
  if (path.resolve(newest) !== path.resolve(stableWebm)) {
    try {
      fs.renameSync(newest, stableWebm);
    } catch {
      fs.copyFileSync(newest, stableWebm);
    }
  }

  // Optional MP4 conversion if ffmpeg exists.
  const ffmpeg = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
  if (ffmpeg.status === 0) {
    const mp4 = path.join(videosDir, "demo-recording.mp4");
    spawnSync("ffmpeg", ["-y", "-i", stableWebm, "-c:v", "libx264", "-preset", "fast", "-crf", "22", mp4], {
      stdio: "inherit",
    });
  }
}

// eslint-disable-next-line no-console
console.log("🎥 Demo recorded", { baseUrl: baseUrl(), videosDir: path.relative(process.cwd(), videosDir) });
