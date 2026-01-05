import fs from "fs";
import os from "os";
import path from "path";
import crypto from "crypto";
import archiver from "archiver";
import { Readable } from "stream";
import { exportDataRoom } from "../../../../scripts/exportDataRoom";

export const runtime = "nodejs";

function requireAuth(req: Request) {
  const token = process.env.DATA_ROOM_TOKEN;
  if (!token) {
    throw new Error(
      "DATA_ROOM_TOKEN is not set. Refusing to export data room without explicit server-side authorization."
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  const provided = match?.[1] ?? "";
  if (!provided || provided !== token) {
    const err = new Error("Unauthorized");
    (err as any).statusCode = 401;
    throw err;
  }
}

async function listFiles(rootDir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) await walk(full);
      else if (ent.isFile()) out.push(full);
    }
  }
  await walk(rootDir);
  return out.sort();
}

export async function GET(req: Request) {
  try {
    requireAuth(req);

    const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "bickford-data-room-"));
    const outDir = path.join(tmpRoot, "bickford-acquisition-data-room");

    await exportDataRoom(outDir);

    const zipPath = path.join(tmpRoot, "bickford-acquisition-data-room.zip");
    const output = fs.createWriteStream(zipPath);

    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    const fixedDate = new Date("1980-01-01T00:00:00.000Z");

    archive.on("warning", (err) => {
      // eslint-disable-next-line no-console
      console.warn("archiver warning", err);
    });

    await new Promise<void>((resolve, reject) => {
      output.on("close", resolve);
      output.on("error", reject);
      archive.on("error", reject);
      archive.pipe(output);

      void (async () => {
        const files = await listFiles(outDir);
        for (const full of files) {
          const rel = path.relative(outDir, full).split(path.sep).join("/");
          archive.file(full, { name: `bickford-acquisition-data-room/${rel}`, date: fixedDate });
        }
        await archive.finalize();
      })().catch(reject);
    });

    const zipBuf = await fs.promises.readFile(zipPath);
    const sha256 = crypto.createHash("sha256").update(zipBuf).digest("hex");

    const nodeStream = fs.createReadStream(zipPath);
    nodeStream.on("close", async () => {
      try {
        await fs.promises.rm(tmpRoot, { recursive: true, force: true });
      } catch {
        // ignore
      }
    });

    return new Response(Readable.toWeb(nodeStream) as any, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="bickford-acquisition-data-room.zip"',
        "X-Content-SHA256": sha256,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    const status = err?.statusCode ?? 500;
    return new Response(err?.message ?? "Export failed", { status });
  }
}
