import { rollbackToSafeState } from "@/lib/recovery/rollback";

export async function rollbackLastCommit(executionId: string, reason: string) {
  const res = await rollbackToSafeState(executionId, reason);
  return res.restoredCommit;
}
