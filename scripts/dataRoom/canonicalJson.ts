import crypto from "crypto";

function toJsonSafe(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(toJsonSafe);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    const out: Record<string, unknown> = {};
    for (const key of keys) out[key] = toJsonSafe(record[key]);
    return out;
  }
  return value;
}

export function canonicalJsonString(value: unknown): string {
  return JSON.stringify(toJsonSafe(value));
}

export function sha256HexFromCanonicalJson(value: unknown): string {
  return crypto.createHash("sha256").update(canonicalJsonString(value)).digest("hex");
}

export function sha256HexFromBytes(bytes: Buffer | string): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
