import { FOUNDER } from "@/lib/invariants/founder";

export function assertFounderExecution() {
  const key = (process.env.BICKFORD_FOUNDER_KEY ?? "").trim();

  if (!key) {
    throw new Error(
      "EXECUTION BLOCKED: Founder key not present. No authority to execute.",
    );
  }

  return {
    authorizedBy: FOUNDER.id,
    authority: FOUNDER.role,
    publicKeyFingerprint: FOUNDER.publicKeyFingerprint,
    irreversible: true,
  };
}
