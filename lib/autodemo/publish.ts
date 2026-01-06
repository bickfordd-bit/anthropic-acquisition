import fs from "node:fs";
import path from "node:path";

function env(name: string): string | null {
  const v = (process.env[name] ?? "").trim();
  return v.length ? v : null;
}

function publicBaseUrl(): string {
  const b = env("BICKFORD_PUBLIC_BASE_URL") ?? env("BICKFORD_BASE_URL") ?? "";
  return b.replace(/\/$/, "");
}

export async function publishDemo(params: {
  videoPath: string;
  transcript: string;
  executionId: string;
  type: string;
}): Promise<{ url: string | null; publicPath: string }> {
  const outDir = env("BICKFORD_DEMO_OUTPUT_DIR") ?? path.join(process.cwd(), "public", "demos");
  fs.mkdirSync(outDir, { recursive: true });

  const stamp = Date.now();
  const safeExec = params.executionId.replaceAll(/[^a-zA-Z0-9_-]/g, "_");
  const safeType = params.type.replaceAll(/[^a-zA-Z0-9_-]/g, "_");

  const filename = `${safeType}-${safeExec}-${stamp}.webm`;
  const transcriptName = `${safeType}-${safeExec}-${stamp}.txt`;

  const destVideo = path.join(outDir, filename);
  const destTranscript = path.join(outDir, transcriptName);

  fs.copyFileSync(params.videoPath, destVideo);
  fs.writeFileSync(destTranscript, params.transcript.trim() + "\n");

  // If output dir is under Next.js public/, return a static URL.
  let publicPath = destVideo;
  const publicRoot = path.join(process.cwd(), "public") + path.sep;
  if (destVideo.startsWith(publicRoot)) {
    publicPath = destVideo.slice(publicRoot.length).replaceAll(path.sep, "/");
  }

  const base = publicBaseUrl();
  const url = base && !publicPath.startsWith("/") ? `${base}/${publicPath}` : base ? `${base}${publicPath.startsWith("/") ? "" : "/"}${publicPath}` : null;

  return { url, publicPath };
}
