import { scoreOPTR } from "@/lib/optr";
import { enforceApiAuth, enforceRateLimit, readJson } from "@/lib/apiSecurity";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = enforceApiAuth(req);
  if (auth) return auth;

  const limited = enforceRateLimit(req, { keyPrefix: "optr:score", limit: 120, windowMs: 60_000 });
  if (limited) return limited;

  const parsed = await readJson<{ risk?: unknown; allowedRisk?: unknown }>(req);
  if (!parsed.ok) return parsed.response;

  const toNumber = (value: unknown, fallback = 0): number => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim().length) {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
    return fallback;
  };

  const risk = toNumber(parsed.value.risk, 0);
  const allowedRisk = toNumber(parsed.value.allowedRisk, 0);

  return Response.json(scoreOPTR({ risk, allowedRisk }));
}
