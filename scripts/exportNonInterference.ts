import path from "path";
import { prisma } from "../lib/prisma";
import { ensureDir, writeJson } from "./dataRoom/fsUtils";

export async function exportNonInterference(outRoot: string) {
  const proofsDir = path.join(outRoot, "PROOFS");
  await ensureDir(proofsDir);

  const checks = await prisma.ledgerEntry.findMany({
    where: { type: "non_interference_check" },
    orderBy: { createdAt: "asc" },
  });

  await writeJson(
    path.join(proofsDir, "non-interference-proofs.json"),
    checks.map((c) => {
      let content: unknown = c.content;
      if (typeof content === "string") {
        try {
          content = JSON.parse(content);
        } catch {
          // leave as string
        }
      }
      return {
        createdAt: c.createdAt.toISOString(),
        hash: c.hash,
        content,
      };
    })
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.env.DATA_ROOM_OUT ?? path.join(process.cwd(), "bickford-acquisition-data-room");
  exportNonInterference(out).then(() => {
    // eslint-disable-next-line no-console
    console.log(`Non-interference proofs exported to ${out}/PROOFS`);
  });
}
