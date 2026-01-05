import fs from "fs";
import path from "path";
import { sha256HexFromBytes } from "./canonicalJson";

export type ManifestEntry = {
  path: string;
  bytes: number;
  sha256: string;
};

export async function ensureDir(dirPath: string) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

export async function writeJson(filePath: string, value: unknown) {
  const json = JSON.stringify(value, null, 2) + "\n";
  await ensureDir(path.dirname(filePath));
  await fs.promises.writeFile(filePath, json, "utf8");
}

export async function writeText(filePath: string, text: string) {
  await ensureDir(path.dirname(filePath));
  const normalized = text.endsWith("\n") ? text : text + "\n";
  await fs.promises.writeFile(filePath, normalized, "utf8");
}

export async function fileSha256(filePath: string): Promise<{ bytes: number; sha256: string }> {
  const buf = await fs.promises.readFile(filePath);
  return { bytes: buf.byteLength, sha256: sha256HexFromBytes(buf) };
}

export async function listFilesRecursively(rootDir: string): Promise<string[]> {
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
