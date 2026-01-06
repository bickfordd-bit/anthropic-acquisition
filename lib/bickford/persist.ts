import { commitAndPush } from "@/lib/bickford/git";
import { commitPlanToGitHubPullRequest } from "@/lib/bickford/github";
import { triggerNetlifyDeploy, waitForDeployPreviewByBranch } from "@/lib/bickford/netlify";
import { appendLedgerEvent } from "@/lib/ledger/write";

type PersistArgs = {
  plan: any;
  executionId: string;
};

export type PersistResult = {
  mode: "local" | "github";
  sha?: string;
  prUrl?: string;
  deployUrl?: string;
};

function shouldUseGitHubMode(): boolean {
  const forced = (process.env.BICKFORD_PERSIST_MODE ?? "").trim().toLowerCase();
  if (forced === "github") return true;
  if (forced === "local") return false;

  // In Netlify/serverless, shelling out to git is not reliable.
  const isNetlify = Boolean(process.env.NETLIFY);
  if (isNetlify) return true;

  return Boolean(process.env.GITHUB_TOKEN);
}

export async function persistPlan({ plan, executionId }: PersistArgs): Promise<PersistResult> {
  const summary = String(plan?.summary ?? "Bickford execution");
  const useGitHub = shouldUseGitHubMode();

  if (!useGitHub) {
    const sha = await commitAndPush(summary);
    const deployUrl = await triggerNetlifyDeploy(executionId, sha);
    return { mode: "local", sha, deployUrl };
  }

  const pr = await commitPlanToGitHubPullRequest({ plan, executionId });
  const deployUrl = pr.branch ? await waitForDeployPreviewByBranch(executionId, pr.branch) : undefined;

  appendLedgerEvent({
    id: crypto.randomUUID(),
    executionId,
    type: "DEPLOY_TRIGGERED",
    summary: "GitHub PR created",
    details: { prUrl: pr.prUrl, branch: pr.branch, deployUrl },
    timestamp: new Date().toISOString(),
  });

  return { mode: "github", prUrl: pr.prUrl, deployUrl };
}
