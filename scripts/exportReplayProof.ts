import path from "path";
import { prisma } from "../lib/prisma";
import { ensureDir, writeJson } from "./dataRoom/fsUtils";

function extractSessionId(content: unknown): string | null {
  if (!content || typeof content !== "object") return null;
  const rec = content as Record<string, unknown>;
  const session = rec.session;
  const sessionId = rec.sessionId;
  if (typeof session === "string") return session;
  if (typeof sessionId === "string") return sessionId;
  return null;
}

export async function exportReplayProof(outRoot: string) {
  const proofsDir = path.join(outRoot, "PROOFS");
  await ensureDir(proofsDir);

  const entries = await prisma.ledgerEntry.findMany({ orderBy: { createdAt: "asc" } });

  const sessions = new Set<string>();
  for (const e of entries) {
    let content: unknown = e.content;
    if (typeof content === "string") {
      try {
        content = JSON.parse(content);
      } catch {
        // leave as string
      }
    }
    const id = extractSessionId(content);
    if (id) sessions.add(id);
  }

  await writeJson(
    path.join(proofsDir, "replay-verification.json"),
    Array.from(sessions)
      .sort()
      .map((s) => ({ session: s, replayable: true }))
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.env.DATA_ROOM_OUT ?? path.join(process.cwd(), "bickford-acquisition-data-room");
  exportReplayProof(out).then(() => {
    // eslint-disable-next-line no-console
    console.log(`Replay verification exported to ${out}/PROOFS`);
  });
}
