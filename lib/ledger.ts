import { prisma } from "@/lib/prisma";
import { hashEntry, stableStringify } from "@/lib/hash";

export async function appendLedger(entry: { type: string; [k: string]: unknown }) {
  const last = await prisma.ledgerEntry.findFirst({
    orderBy: { createdAt: "desc" },
    select: { hash: true },
  });

  const prevHash = last?.hash ?? null;
  const content = stableStringify(entry);
  const hash = hashEntry(`${prevHash ?? ""}\n${content}`);

  const intent = typeof (entry as any).intent === "string" ? ((entry as any).intent as string) : null;
  const decision =
    typeof (entry as any).decision === "string" ? ((entry as any).decision as string) : null;
  const rationale =
    typeof (entry as any).rationale === "string" ? ((entry as any).rationale as string) : null;
  const actor = typeof (entry as any).actor === "string" ? ((entry as any).actor as string) : null;
  const systemInitiated =
    typeof (entry as any).systemInitiated === "boolean"
      ? ((entry as any).systemInitiated as boolean)
      : undefined;

  return prisma.ledgerEntry.create({
    data: {
      type: entry.type,
      intent,
      decision,
      rationale,
      actor,
      systemInitiated,
      content,
      prevHash,
      hash,
    },
  });
}

export async function verifyLedgerChain(take = 5000) {
  const rows = await prisma.ledgerEntry.findMany({
    take,
    orderBy: { createdAt: "asc" },
    select: { id: true, prevHash: true, hash: true, content: true, createdAt: true },
  });

  let prev: string | null = null;
  for (const row of rows) {
    const expected = hashEntry(`${prev ?? ""}\n${row.content}`);
    const prevOk = row.prevHash === prev;
    const hashOk = row.hash === expected;
    if (!prevOk || !hashOk) {
      return {
        ok: false as const,
        error: {
          id: row.id,
          createdAt: row.createdAt,
          prevHash: row.prevHash,
          expectedPrevHash: prev,
          hash: row.hash,
          expectedHash: expected,
          prevOk,
          hashOk,
        },
        count: rows.length,
        head: rows[0]?.hash ?? null,
        tail: rows[rows.length - 1]?.hash ?? null,
      };
    }
    prev = row.hash;
  }

  return {
    ok: true as const,
    count: rows.length,
    head: rows[0]?.hash ?? null,
    tail: rows[rows.length - 1]?.hash ?? null,
  };
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function readLedger(take = 500) {
  const rows = await prisma.ledgerEntry.findMany({
    take,
    orderBy: { createdAt: "desc" },
  });

  return rows.map((r) => ({
    ...r,
    content: safeJsonParse(r.content),
  }));
}

export async function getLastExecutionEntries(take = 20) {
  return prisma.ledgerEntry.findMany({
    where: { type: "execution" },
    take,
    orderBy: { createdAt: "desc" },
  });
}
