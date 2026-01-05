import { prisma } from "@/lib/prisma";
import { enforceApiAuth, enforceRateLimit } from "@/lib/apiSecurity";

export const runtime = "nodejs";

function flattenValues(obj: unknown, prefix = ""): Array<{ path: string; value: string }> {
  if (obj === null || obj === undefined) return [];
  if (typeof obj !== "object") {
    return prefix ? [{ path: prefix, value: JSON.stringify(obj) }] : [];
  }

  if (Array.isArray(obj)) {
    const out: Array<{ path: string; value: string }> = [];
    obj.forEach((v, i) =>
      out.push(...flattenValues(v, prefix ? `${prefix}[${i}]` : `[${i}]`)),
    );
    return out;
  }

  const out: Array<{ path: string; value: string }> = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    out.push(...flattenValues(v, key));
  }
  return out;
}

function changedKeys(prev: unknown, curr: unknown) {
  const a = new Map(flattenValues(prev).map((x) => [x.path, x.value]));
  const b = new Map(flattenValues(curr).map((x) => [x.path, x.value]));
  const all = new Set([...a.keys(), ...b.keys()]);
  const changed: string[] = [];

  for (const k of all) {
    const av = a.get(k);
    const bv = b.get(k);
    if (av === undefined || bv === undefined || av !== bv) changed.push(k);
  }

  return changed.sort();
}

export async function GET(req: Request) {
  const auth = enforceApiAuth(req);
  if (auth) return auth;

  const limited = enforceRateLimit(req, { keyPrefix: "canon:diff", limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const canon = await prisma.canonEntry.findMany({
    orderBy: { promotedAt: "asc" },
  });

  const diffs = canon.map((c, i) => {
    const previous = i === 0 ? null : JSON.parse(canon[i - 1].content);
    const current = JSON.parse(c.content);
    return {
      id: c.id,
      title: c.title,
      previous,
      current,
      promotedAt: c.promotedAt,
      changedKeys: changedKeys(previous, current),
    };
  });

  return Response.json(diffs);
}
