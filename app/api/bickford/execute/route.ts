// app/api/bickford/execute/route.ts
import { NextRequest, NextResponse } from "next/server";
import { planFromIntent } from "@/lib/bickford/planner";
import { applyPlan } from "@/lib/bickford/applier";
import { commitAndPush } from "@/lib/bickford/git";
import { deployToNetlify } from "@/lib/bickford/netlify";
import { rollbackToLastCommit } from "@/lib/bickford/rollback";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { intent } = await req.json();

    if (!intent || typeof intent !== "string") {
      return NextResponse.json({ error: "Intent is required" }, { status: 400 });
    }

    // Step 1: Generate and evaluate plan
    const planResult = await planFromIntent(intent);
    const { plan, executionId } = planResult;

    // Step 2: Apply changes to filesystem
    const applyResult = await applyPlan(plan, executionId);

    // Step 3: Commit and push
    const commitResult = commitAndPush(plan.summary, executionId);

    // Step 4: Deploy if required
    let deployResult = null;
    if (plan.requiresDeploy) {
      try {
        deployResult = await deployToNetlify(executionId);

        // Check if deploy failed
        if (!deployResult.success) {
          console.error("Deploy failed, initiating rollback...");
          await rollbackToLastCommit(
            `Deploy failed with status: ${deployResult.status}`,
            executionId
          );
          
          return NextResponse.json(
            {
              error: "Deploy failed and changes were rolled back",
              executionId,
              deployStatus: deployResult.status,
            },
            { status: 500 }
          );
        }
      } catch (deployError: any) {
        console.error("Deploy error, initiating rollback:", deployError.message);
        await rollbackToLastCommit(`Deploy error: ${deployError.message}`, executionId);
        
        return NextResponse.json(
          {
            error: "Deploy failed and changes were rolled back",
            executionId,
            details: deployError.message,
          },
          { status: 500 }
        );
      }
    }

    // Success!
    return NextResponse.json({
      success: true,
      executionId,
      summary: plan.summary,
      filesChanged: applyResult.filesChanged,
      commitSha: commitResult.sha,
      deployUrl: deployResult?.deployUrl || null,
      deployStatus: deployResult?.status || null,
    });
  } catch (error: any) {
    console.error("Execution error:", error.message);
    return NextResponse.json(
      { 
        error: error.message,
        details: error.stack 
      }, 
      { status: 500 }
    );
  }
}
