// app/api/bickford/execute/route.ts
import { NextRequest, NextResponse } from "next/server";
import { applyPlan } from "@/lib/bickford/applier";
import { commitAndPush } from "@/lib/bickford/git";
import { deploy } from "@/lib/bickford/deploy";
import { record } from "@/lib/bickford/ledger";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json();
    
    // Apply changes
    await applyPlan(plan);
    
    // Commit and push
    commitAndPush(plan.summary);
    
    // Deploy if needed
    let deployUrl = null;
    if (plan.requiresDeploy) {
      deployUrl = await deploy();
    }
    
    // Record to ledger
    record({
      type: "execution",
      summary: plan.summary,
      deployUrl,
    });
    
    return NextResponse.json({
      summary: plan.summary,
      deployUrl,
    });
  } catch (error: any) {
    record({
      type: "failure",
      error: error.message,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
