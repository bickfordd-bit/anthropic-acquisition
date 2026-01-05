import path from "path";
import { prisma } from "../lib/prisma";
import { COMPOUNDING_INTELLIGENCE_CANON } from "../canon/compounding-intelligence";
import { sha256HexFromCanonicalJson } from "./dataRoom/canonicalJson";
import { ensureDir, writeJson, writeText } from "./dataRoom/fsUtils";

export type CanonExportResult = {
  canonIndexPath: string;
  canonChainPath: string;
  entryCount: number;
};

export async function exportCanon(outRoot: string): Promise<CanonExportResult> {
  const canonDir = path.join(outRoot, "CANON");
  await ensureDir(canonDir);

  const canon = await prisma.canonEntry.findMany({ orderBy: { promotedAt: "asc" } });

  const index: Array<{
    id: string;
    title: string;
    promotedAt: string;
    ledgerHash: string;
    hash: string;
    file: string;
  }> = [];

  const chainLines: string[] = [];

  for (const c of canon) {
    let content: unknown = c.content;
    try {
      content = JSON.parse(c.content);
    } catch {
      // leave as string
    }

    const payload = {
      id: c.id,
      title: c.title,
      promotedAt: c.promotedAt.toISOString(),
      content,
      ledgerHash: c.ledgerHash,
    };

    const hash = sha256HexFromCanonicalJson(payload);
    const filename = `${c.id}.json`;

    await writeJson(path.join(canonDir, filename), payload);

    index.push({
      id: c.id,
      title: c.title,
      promotedAt: payload.promotedAt,
      ledgerHash: c.ledgerHash,
      hash,
      file: `CANON/${filename}`,
    });

    chainLines.push(hash);
  }

  // Always include the canon source artifact itself as a named, buyer-friendly file.
  await writeJson(path.join(canonDir, "compounding-intelligence-v1.json"), COMPOUNDING_INTELLIGENCE_CANON);

  const canonIndexPath = path.join(canonDir, "canon-index.json");
  const canonChainPath = path.join(canonDir, "canon-hash-chain.txt");

  await writeJson(canonIndexPath, index);
  await writeText(canonChainPath, chainLines.join("\n"));

  return {
    canonIndexPath,
    canonChainPath,
    entryCount: canon.length,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.env.DATA_ROOM_OUT ?? path.join(process.cwd(), "bickford-acquisition-data-room");
  exportCanon(out).then(() => {
    // eslint-disable-next-line no-console
    console.log(`Canon exported to ${out}/CANON`);
  });
}
