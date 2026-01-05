// lib/invariants/bickfordIdentity.ts
export const BICKFORD_IDENTITY = {
  canonicalName: "Bickford",
  systemId: "bickford",
  enforced: true,
} as const;

export function assertBickfordIdentity(input: string) {
  if (input !== BICKFORD_IDENTITY.canonicalName) {
    throw new Error(
      `IDENTITY VIOLATION: Expected "${BICKFORD_IDENTITY.canonicalName}", got "${input}"`
    );
  }
}
