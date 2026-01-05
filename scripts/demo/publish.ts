import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const demoDir = path.join(process.cwd(), "demo");
const artifactsDir = path.join(demoDir, "artifacts");
const videosDir = path.join(demoDir, "videos");

function env(name: string): string | null {
  const v = (process.env[name] ?? "").trim();
  return v.length ? v : null;
}

function gitCommit(): string | null {
  try {
    return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return null;
  }
}

function shortSha(sha: string) {
  return sha.slice(0, 7);
}

function listFiles(dir: string): string[] {
  try {
    return fs
      .readdirSync(dir)
      .map((f) => path.join(dir, f))
      .filter((p) => fs.statSync(p).isFile())
      .sort();
  } catch {
    return [];
  }
}

function contentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".zip":
      return "application/zip";
    case ".json":
      return "application/json";
    case ".txt":
      return "text/plain";
    case ".webm":
      return "video/webm";
    case ".mp4":
      return "video/mp4";
    case ".png":
      return "image/png";
    default:
      return "application/octet-stream";
  }
}

async function ghRequest(url: string, init: RequestInit, token: string) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers ?? {}),
    },
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }

  return { ok: res.ok, status: res.status, json, text };
}

async function getOrCreateRelease(params: {
  owner: string;
  repo: string;
  token: string;
  tag: string;
  name: string;
  body: string;
  targetCommitish: string;
}) {
  const { owner, repo, token, tag, name, body, targetCommitish } = params;
  const base = `https://api.github.com/repos/${owner}/${repo}`;

  // Try fetch by tag.
  const existing = await ghRequest(`${base}/releases/tags/${encodeURIComponent(tag)}`, { method: "GET" }, token);
  if (existing.ok && existing.json?.id) {
    return existing.json;
  }

  const created = await ghRequest(
    `${base}/releases`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tag_name: tag,
        target_commitish: targetCommitish,
        name,
        body,
        draft: false,
        prerelease: false,
        generate_release_notes: false,
      }),
    },
    token,
  );

  if (!created.ok) {
    throw new Error(
      `Failed to create GitHub release (${created.status}): ${created.text || JSON.stringify(created.json)}`,
    );
  }
  return created.json;
}

async function uploadAsset(params: {
  uploadUrlTemplate: string;
  filePath: string;
  token: string;
  owner: string;
  repo: string;
  releaseId: number;
}) {
  const { uploadUrlTemplate, filePath, token, owner, repo, releaseId } = params;
  const base = uploadUrlTemplate.split("{")[0];
  const name = path.basename(filePath);

  // If asset exists, delete it first to allow overwrite.
  const list = await ghRequest(
    `https://api.github.com/repos/${owner}/${repo}/releases/${releaseId}/assets`,
    { method: "GET" },
    token,
  );

  if (list.ok && Array.isArray(list.json)) {
    const existing = list.json.find((a: any) => a?.name === name);
    if (existing?.id) {
      await ghRequest(
        `https://api.github.com/repos/${owner}/${repo}/releases/assets/${existing.id}`,
        { method: "DELETE" },
        token,
      );
    }
  }

  const buf = fs.readFileSync(filePath);
  const res = await fetch(`${base}?name=${encodeURIComponent(name)}`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": contentType(filePath),
      "Content-Length": String(buf.byteLength),
    },
    body: buf,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to upload asset ${name} (${res.status}): ${text}`);
  }
}

const videosAbs = listFiles(videosDir);
const artifactsAbs = listFiles(artifactsDir);

const videos = videosAbs.map((p) => path.relative(process.cwd(), p));
const artifacts = artifactsAbs.map((p) => path.relative(process.cwd(), p));

const screenshotsDir = path.join(demoDir, "screenshots");
const screenshotsAbs = listFiles(screenshotsDir);
const screenshots = screenshotsAbs.map((p) => path.relative(process.cwd(), p));

const scriptPath = path.join(demoDir, "script.txt");
const hasScript = fs.existsSync(scriptPath);

const commit = env("GITHUB_SHA") ?? gitCommit();
const publishRelease = (env("PUBLISH_GITHUB_RELEASE") ?? "").toLowerCase() === "true";

const manifest = {
  generatedAt: new Date().toISOString(),
  commit,
  videos,
  artifacts,
  screenshots,
  publish: {
    githubRelease: publishRelease,
  },
};

async function tryLedgerAppendDemoPublished(params: {
  manifest: typeof manifest;
  videosCount: number;
  artifactsCount: number;
}) {
  if (!process.env.DATABASE_URL) return;

  try {
    const mod = await import("../../lib/ledger");
    await mod.appendLedger({
      type: "demo_published",
      manifest: params.manifest,
      videosCount: params.videosCount,
      artifactsCount: params.artifactsCount,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("(warn) failed to append demo_published to ledger", err);
  }
}

fs.mkdirSync(demoDir, { recursive: true });
fs.writeFileSync(path.join(demoDir, "publish.json"), JSON.stringify(manifest, null, 2) + "\n");

// eslint-disable-next-line no-console
console.log("🚀 Demo packaged for publishing", manifest);

// Optional: publish to GitHub Releases
const token = env("GITHUB_TOKEN");
const repoSlug = env("GITHUB_REPOSITORY");

if (publishRelease) {
  if (!token) {
    throw new Error("PUBLISH_GITHUB_RELEASE=true but GITHUB_TOKEN is not set");
  }
  if (!repoSlug || !repoSlug.includes("/")) {
    throw new Error("PUBLISH_GITHUB_RELEASE=true but GITHUB_REPOSITORY is missing/invalid");
  }
  if (!commit) {
    throw new Error("PUBLISH_GITHUB_RELEASE=true but commit SHA is unavailable");
  }

  const [owner, repo] = repoSlug.split("/") as [string, string];
  const tag = `demo-${shortSha(commit)}`;
  const name = `Demo ${shortSha(commit)}`;

  let body = "Autonomous demo artifacts generated by CI.\n";
  if (hasScript) {
    const scriptText = fs.readFileSync(scriptPath, "utf8").trim();
    if (scriptText) body += `\n---\n\n${scriptText}\n`;
  }

  // eslint-disable-next-line no-console
  console.log("📦 Creating/updating GitHub Release", { owner, repo, tag });

  const release = await getOrCreateRelease({
    owner,
    repo,
    token,
    tag,
    name,
    body,
    targetCommitish: commit,
  });

  const uploadUrlTemplate = release.upload_url as string;
  const releaseId = release.id as number;

  const uploadCandidatesAbs: string[] = [];
  for (const p of [scriptPath, path.join(demoDir, "publish.json")]) {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) uploadCandidatesAbs.push(p);
  }
  uploadCandidatesAbs.push(...artifactsAbs, ...screenshotsAbs, ...videosAbs);

  // Keep the asset list deterministic.
  const uniqueAbs = Array.from(new Set(uploadCandidatesAbs)).sort();
  for (const filePath of uniqueAbs) {
    // eslint-disable-next-line no-console
    console.log("⬆️ Uploading asset", path.relative(process.cwd(), filePath));
    await uploadAsset({ uploadUrlTemplate, filePath, token, owner, repo, releaseId });
  }

  await tryLedgerAppendDemoPublished({
    manifest,
    videosCount: videos.length,
    artifactsCount: artifacts.length,
  });

  // eslint-disable-next-line no-console
  console.log("✅ GitHub Release published", { tag, url: release.html_url });
}
