// lib/bickford/planner.ts
import { assertBickfordIdentity } from "@/lib/invariants/bickfordIdentity";
import { Plan } from "./applier";
import { generatePlanFromIntent } from "./claudePlanner";
import { evaluatePlan } from "@/lib/canon/core";
import { appendToLedger } from "@/lib/ledger/write";
import crypto from "crypto";

export interface PlanResult {
  plan: Plan;
  canonDecision: string;
  canonRationale: string;
  executionId: string;
}

/**
 * Generates an execution plan from intent using Claude,
 * evaluates it against Canon rules, and logs to ledger
 * @param intent - Natural language intent
 * @returns Plan with Canon evaluation
 * @throws Error if plan is denied by Canon
 */
export async function planFromIntent(intent: string): Promise<PlanResult> {
  assertBickfordIdentity("Bickford");

  // Generate unique execution ID
  const executionId = crypto.randomUUID();

  // Log execution start
  appendToLedger({
    type: "EXECUTION_STARTED",
    executionId,
    intent,
    timestamp: new Date().toISOString(),
  });

  // Generate plan using Claude (or fallback to simple plan)
  let plan: Plan;
  try {
    plan = await generatePlanFromIntent(intent);
  } catch (error: any) {
    // Fallback to simple plan if Claude fails
    console.warn("Claude planning failed, using fallback:", error.message);
    plan = {
      summary: `Apply intent: ${intent}`,
      files: [
        {
          path: "README.md",
          content: `# Bickford Update\n\nIntent: ${intent}\n\nTimestamp: ${new Date().toISOString()}\n`,
        },
      ],
      requiresDeploy: false,
    };
  }

  // Evaluate against Canon
  const canonEvaluation = evaluatePlan(plan);

  // Log plan generation
  appendToLedger({
    type: "PLAN_GENERATED",
    executionId,
    plan,
    canonDecision: canonEvaluation.decision,
    canonRationale: canonEvaluation.rationale,
    timestamp: new Date().toISOString(),
  });

  // Throw error if denied
  if (!canonEvaluation.allowed) {
    throw new Error(`Canon denied: ${canonEvaluation.rationale}`);
  }

  return {
    plan,
    canonDecision: canonEvaluation.decision,
    canonRationale: canonEvaluation.rationale,
    executionId,
  };
}
