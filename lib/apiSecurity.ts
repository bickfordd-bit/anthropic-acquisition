import { timingSafeEqual } from "node:crypto";

type RateLimitOptions = {
  keyPrefix: string;
  limit: number;
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

function getGlobalBuckets(): Map<string, Bucket> {
  const g = globalThis as unknown as { __bickfordRateLimitBuckets?: Map<string, Bucket> };
  if (!g.__bickfordRateLimitBuckets) g.__bickfordRateLimitBuckets = new Map();
  return g.__bickfordRateLimitBuckets;
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}

export function enforceRateLimit(req: Request, options: RateLimitOptions): Response | null {
  const ip = getClientIp(req);
  const now = Date.now();

  const buckets = getGlobalBuckets();
  const key = `${options.keyPrefix}:${ip}`;

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return null;
  }

  existing.count += 1;
  buckets.set(key, existing);

  if (existing.count <= options.limit) return null;

  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  return Response.json(
    { error: "Rate limit exceeded" },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}

function constantTimeEquals(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export function enforceApiAuth(req: Request): Response | null {
  const publicApi = process.env.BICKFORD_PUBLIC_API === "true";
  const required = process.env.NODE_ENV === "production" && !publicApi;

  const expected = process.env.BICKFORD_API_TOKEN?.trim() ?? "";

  // In local/dev, do not force auth unless a token is configured.
  const mustCheck = required || expected.length > 0;
  if (!mustCheck) return null;

  if (!expected) {
    return Response.json(
      { error: "Server auth not configured" },
      {
        status: 503,
      },
    );
  }

  const header = req.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  const alt = req.headers.get("x-bickford-token")?.trim() ?? "";
  const presented = bearer || alt;

  if (!presented) {
    return Response.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": "Bearer",
        },
      },
    );
  }

  if (!constantTimeEquals(presented, expected)) {
    return Response.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": "Bearer",
        },
      },
    );
  }

  return null;
}

export async function readJson<T>(req: Request): Promise<{ ok: true; value: T } | { ok: false; response: Response }> {
  try {
    const contentLength = Number(req.headers.get("content-length") ?? "0") || 0;
    const maxBytes = Number(process.env.BICKFORD_MAX_JSON_BYTES ?? "262144") || 262144;

    if (contentLength && contentLength > maxBytes) {
      return {
        ok: false,
        response: Response.json({ error: "Payload too large" }, { status: 413 }),
      };
    }

    const value = (await req.json()) as T;
    return { ok: true, value };
  } catch {
    return { ok: false, response: Response.json({ error: "Invalid JSON" }, { status: 400 }) };
  }
}

export function safeErrorMessage(e: unknown): string {
  if (process.env.NODE_ENV === "production") return "Internal error";
  return e instanceof Error ? e.message : String(e);
}
