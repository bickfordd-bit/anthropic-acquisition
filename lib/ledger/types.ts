export type LedgerEventType =
  | "EXECUTION_STARTED"
  | "PLAN_GENERATED"
  | "CANON_DENIAL"
  | "FILES_APPLIED"
  | "DEPLOY_TRIGGERED"
  | "DEPLOY_COMPLETE"
  | "ROLLBACK_EXECUTED";

export interface LedgerEvent {
  id: string;
  executionId: string;
  type: LedgerEventType;
  summary: string;
  details?: Record<string, any>;
  timestamp: string;
}
