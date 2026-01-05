import crypto from "crypto";

export function hashEntry(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function stableNormalize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stableNormalize);

  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    out[key] = stableNormalize(obj[key]);
  }
  return out;
}

export function stableStringify(value: unknown) {
  return JSON.stringify(stableNormalize(value));
}

export function hashObject(obj: unknown) {
  return crypto.createHash("sha256").update(stableStringify(obj)).digest("hex");
}
