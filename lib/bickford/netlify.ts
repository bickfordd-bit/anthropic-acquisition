import { appendLedgerEvent } from "@/lib/ledger/write";
import { rollbackLastCommit } from "@/lib/bickford/rollback";

const NETLIFY_API = "https://api.netlify.com/api/v1";

export async function triggerNetlifyDeploy(executionId: string, commitSha?: string) {
  appendLedgerEvent({
    id: crypto.randomUUID(),
    executionId,
    type: "DEPLOY_TRIGGERED",
    summary: "Netlify deploy triggered",
    details: commitSha ? { commitSha } : undefined,
    timestamp: new Date().toISOString(),
  });

  if (!process.env.NETLIFY_BUILD_HOOK) throw new Error("Missing NETLIFY_BUILD_HOOK");
  if (!process.env.NETLIFY_SITE_ID) throw new Error("Missing NETLIFY_SITE_ID");
  if (!process.env.NETLIFY_TOKEN) throw new Error("Missing NETLIFY_TOKEN");

  await fetch(process.env.NETLIFY_BUILD_HOOK, { method: "POST" });

  const result = await waitForDeployResult(executionId, commitSha);
  if (!result.success) {
    await rollbackLastCommit(executionId, result.reason);
    throw new Error("DEPLOY_FAILED");
  }

  return result.deployUrl;
}

export async function waitForDeployPreviewByBranch(executionId: string, branch: string) {
  if (!process.env.NETLIFY_SITE_ID || !process.env.NETLIFY_TOKEN) return undefined;
  const result = await waitForBranchDeploy(executionId, branch);
  return result.success ? result.deployUrl : undefined;
}

async function waitForDeployResult(executionId: string, commitSha?: string) {
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`${NETLIFY_API}/sites/${process.env.NETLIFY_SITE_ID}/deploys`, {
      headers: {
        Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`,
      },
    });

    const [latest] = (await res.json()) as any[];

    if (latest?.state === "ready") {
      appendLedgerEvent({
        id: crypto.randomUUID(),
        executionId,
        type: "DEPLOY_COMPLETE",
        summary: "Deploy succeeded",
        details: commitSha ? { url: latest.ssl_url, commitSha } : { url: latest.ssl_url },
        timestamp: new Date().toISOString(),
      });
      return { success: true as const, deployUrl: latest.ssl_url as string };
    }

    if (latest?.state === "error") {
      appendLedgerEvent({
        id: crypto.randomUUID(),
        executionId,
        type: "DEPLOY_COMPLETE",
        summary: "Deploy failed",
        details: commitSha
          ? { error: latest.error_message, commitSha }
          : { error: latest.error_message },
        timestamp: new Date().toISOString(),
      });
      return { success: false as const, reason: String(latest.error_message ?? "unknown") };
    }

    await new Promise((r) => setTimeout(r, 3000));
  }

  return { success: false as const, reason: "Deploy timeout" };
}

async function waitForBranchDeploy(executionId: string, branch: string) {
  for (let i = 0; i < 30; i++) {
    const res = await fetch(`${NETLIFY_API}/sites/${process.env.NETLIFY_SITE_ID}/deploys`, {
      headers: {
        Authorization: `Bearer ${process.env.NETLIFY_TOKEN}`,
      },
    });

    const deploys = (await res.json()) as any[];
    const match = Array.isArray(deploys) ? deploys.find((d) => String(d?.branch ?? "") === branch) : null;

    if (match?.state === "ready") {
      appendLedgerEvent({
        id: crypto.randomUUID(),
        executionId,
        type: "DEPLOY_COMPLETE",
        summary: "Deploy preview ready",
        details: { url: match.ssl_url, branch },
        timestamp: new Date().toISOString(),
      });
      return { success: true as const, deployUrl: String(match.ssl_url) };
    }

    if (match?.state === "error") {
      appendLedgerEvent({
        id: crypto.randomUUID(),
        executionId,
        type: "DEPLOY_COMPLETE",
        summary: "Deploy preview failed",
        details: { error: match.error_message, branch },
        timestamp: new Date().toISOString(),
      });
      return { success: false as const, reason: String(match.error_message ?? "unknown") };
    }

    await new Promise((r) => setTimeout(r, 3000));
  }

  return { success: false as const, reason: "Deploy preview timeout" };
}
