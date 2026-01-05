import path from "path";
import { prisma } from "../lib/prisma";
import { ensureDir, writeJson } from "./dataRoom/fsUtils";

export async function exportOPTRProofs(outRoot: string) {
  const proofsDir = path.join(outRoot, "PROOFS");
  await ensureDir(proofsDir);

  const promotions = await prisma.ledgerEntry.findMany({
    where: { type: "canon_promotion" },
    orderBy: { createdAt: "asc" },
  });

  const canonEntries = await prisma.canonEntry.findMany({ orderBy: { promotedAt: "asc" } });
  const canonByLedgerHash = new Map(canonEntries.map((c) => [c.ledgerHash, c]));

  const proofs = promotions.map((p) => {
    const canon = canonByLedgerHash.get(p.hash);
    let content: any = p.content as any;
    if (typeof content === "string") {
      try {
        content = JSON.parse(content);
      } catch {
        // leave as string
      }
    }

    return {
      ledgerHash: p.hash,
      canonId: canon?.id ?? null,
      canonTitle: canon?.title ?? null,
      promotedAt: p.createdAt.toISOString(),
      deltaTTV: content?.optr?.deltaTTV ?? null,
      nonInterference: content?.optr?.nonInterference ?? null,
    };
  });

  await writeJson(path.join(proofsDir, "optr-promotion-proofs.json"), proofs);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.env.DATA_ROOM_OUT ?? path.join(process.cwd(), "bickford-acquisition-data-room");
  exportOPTRProofs(out).then(() => {
    // eslint-disable-next-line no-console
    console.log(`OPTR proofs exported to ${out}/PROOFS`);
  });
}
