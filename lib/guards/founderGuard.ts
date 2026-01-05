import { FOUNDER } from "@/lib/invariants/founder";

export function assertFounderExecution() {
  const key = process.env.BICKFORD_FOUNDER_KEY;

  if (!key) {
    throw new Error(
      "EXECUTION BLOCKED: Founder key not present. No authority to execute.",
    );
  }

  if (key !== "ALLOW_EXECUTION_V1") {
    throw new Error("EXECUTION BLOCKED: Invalid founder key. Authority denied.");
  }

  return {
    authorizedBy: FOUNDER.id,
    authority: FOUNDER.role,
    publicKeyFingerprint: FOUNDER.publicKeyFingerprint,
    irreversible: true,
  };
}
