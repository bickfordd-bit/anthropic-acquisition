export type LedgerEventType =
  | "EXECUTION_STARTED"
  | "PLAN_GENERATED"
  | "CANON_DENIAL"
  | "FILES_APPLIED"
  | "DEPLOY_TRIGGERED"
  | "DEPLOY_COMPLETE"
  | "SELF_HEAL_RECORDED"
  | "ROLLBACK_EXECUTED"
  | "DEMO_PUBLISHED"
  | "DEMO_RECORDING_FAILED";

export interface LedgerEvent {
  id: string;
  executionId: string;
  type: LedgerEventType;
  summary: string;
  details?: Record<string, any>;
  timestamp: string;
}
