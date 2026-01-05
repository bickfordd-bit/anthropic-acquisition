import fs from "fs";
import path from "path";
import readline from "readline";
import { hashEntry, stableStringify } from "../lib/hash";
import { canonicalJsonString, sha256HexFromBytes, sha256HexFromCanonicalJson } from "./dataRoom/canonicalJson";

type Manifest = {
  schemaVersion: number;
  artifacts: Array<{ path: string; bytes: number; sha256: string }>;
};

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await fs.promises.readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

async function verifyManifest(outRoot: string, manifest: Manifest) {
  const errors: string[] = [];

  for (const a of manifest.artifacts) {
    const full = path.join(outRoot, a.path);
    const buf = await fs.promises.readFile(full);
    const bytes = buf.byteLength;
    const sha256 = sha256HexFromBytes(buf);
    if (bytes !== a.bytes || sha256 !== a.sha256) {
      errors.push(`MANIFEST mismatch: ${a.path} (bytes ${bytes} vs ${a.bytes}, sha ${sha256} vs ${a.sha256})`);
    }
  }

  if (errors.length) throw new Error(errors.join("\n"));
}

async function verifyCanon(outRoot: string) {
  const canonIndexPath = path.join(outRoot, "CANON/canon-index.json");
  const canonChainPath = path.join(outRoot, "CANON/canon-hash-chain.txt");

  const index = await readJson<
    Array<{ id: string; title: string; promotedAt: string; ledgerHash: string; hash: string; file: string }>
  >(canonIndexPath);

  const chain = (await fs.promises.readFile(canonChainPath, "utf8"))
    .trim()
    .split("\n")
    .filter(Boolean);

  if (chain.length !== index.length) {
    throw new Error(`CANON chain length mismatch: ${chain.length} vs ${index.length}`);
  }

  for (let i = 0; i < index.length; i++) {
    const idx = index[i];
    const filePath = path.join(outRoot, idx.file);
    const payload = await readJson<any>(filePath);
    const recomputed = sha256HexFromCanonicalJson(payload);
    if (recomputed !== idx.hash) {
      throw new Error(`CANON hash mismatch for ${idx.file}: ${recomputed} vs ${idx.hash}`);
    }
    if (chain[i] !== idx.hash) {
      throw new Error(`CANON chain mismatch at ${i}: ${chain[i]} vs ${idx.hash}`);
    }
  }
}

async function verifyLedger(outRoot: string) {
  const ledgerJsonlPath = path.join(outRoot, "LEDGER/ledger-export.jsonl");
  const ledgerChainPath = path.join(outRoot, "LEDGER/ledger-hash-chain.txt");

  const chain = (await fs.promises.readFile(ledgerChainPath, "utf8"))
    .trim()
    .split("\n")
    .filter(Boolean);

  const rl = readline.createInterface({ input: fs.createReadStream(ledgerJsonlPath, "utf8") });

  let idx = 0;
  let prev: string | null = null;
  for await (const line of rl) {
    if (!line.trim()) continue;
    const row = JSON.parse(line) as {
      id: string;
      type: string;
      createdAt: string;
      prevHash?: string | null;
      hash: string;
      content: unknown;
    };

    const expectedPrev = row.prevHash ?? null;
    if (expectedPrev !== prev) {
      throw new Error(
        `LEDGER prevHash mismatch at line ${idx + 1}: expected ${prev ?? "null"} but got ${expectedPrev ?? "null"}`
      );
    }

    // Ledger hash semantics: sha256(prevHash + "\n" + stableStringify(content))
    const recomputed = hashEntry(`${prev ?? ""}\n${stableStringify(row.content)}`);
    if (recomputed !== row.hash) {
      throw new Error(`LEDGER entry hash mismatch at line ${idx + 1}: ${recomputed} vs ${row.hash}`);
    }

    if (chain[idx] !== row.hash) {
      throw new Error(`LEDGER chain mismatch at index ${idx}: ${chain[idx]} vs ${row.hash}`);
    }

    prev = row.hash;
    idx++;
  }

  if (idx !== chain.length) {
    throw new Error(`LEDGER line count mismatch: read ${idx} JSONL lines but chain has ${chain.length}`);
  }

  // Additional check: JSONL file bytes are deterministic for identical data ordering.
  // (Not a failure criterion, but helpful debug if needed.)
  void canonicalJsonString;
}

async function main() {
  const outRoot = process.env.DATA_ROOM_OUT ?? path.join(process.cwd(), "bickford-acquisition-data-room");
  const manifestPath = path.join(outRoot, "MANIFEST.json");

  const manifest = await readJson<Manifest>(manifestPath);

  await verifyManifest(outRoot, manifest);
  await verifyCanon(outRoot);
  await verifyLedger(outRoot);

  // eslint-disable-next-line no-console
  console.log("✅ Data room verification passed");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("❌ Data room verification failed\n" + (err?.stack ?? String(err)));
  process.exitCode = 1;
});
