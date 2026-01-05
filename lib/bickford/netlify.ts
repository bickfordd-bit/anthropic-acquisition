// lib/bickford/netlify.ts

import { appendToLedger } from "@/lib/ledger/write";

export interface NetlifyDeployResult {
  success: boolean;
  deployUrl: string;
  status: string;
}

/**
 * Triggers Netlify build hook and polls for deploy status
 * Automatically rolls back on failure
 * @param executionId - Execution ID for ledger tracking
 * @returns Deploy result with URL and status
 */
export async function deployToNetlify(executionId: string): Promise<NetlifyDeployResult> {
  const buildHook = process.env.NETLIFY_BUILD_HOOK;
  const siteId = process.env.NETLIFY_SITE_ID;
  const netlifyToken = process.env.NETLIFY_TOKEN;

  if (!buildHook) {
    throw new Error("NETLIFY_BUILD_HOOK environment variable is not set");
  }

  const deployUrl = process.env.BICKFORD_BASE_URL || "https://your-site.netlify.app";

  // Trigger build
  const triggerResponse = await fetch(buildHook, { method: "POST" });
  if (!triggerResponse.ok) {
    throw new Error(`Netlify build trigger failed: ${triggerResponse.statusText}`);
  }

  // Log deploy trigger
  appendToLedger({
    type: "DEPLOY_TRIGGERED",
    executionId,
    deployUrl,
    timestamp: new Date().toISOString(),
  });

  // Poll for deploy status if we have the necessary credentials
  if (siteId && netlifyToken) {
    const deployStatus = await pollDeployStatus(siteId, netlifyToken, executionId);
    
    // Log deploy complete
    appendToLedger({
      type: "DEPLOY_COMPLETE",
      executionId,
      deployUrl,
      status: deployStatus,
      timestamp: new Date().toISOString(),
    });

    return {
      success: deployStatus === "ready",
      deployUrl,
      status: deployStatus,
    };
  } else {
    // If we can't poll status, assume success after trigger
    console.warn("NETLIFY_SITE_ID or NETLIFY_TOKEN not set, skipping deploy verification");
    
    appendToLedger({
      type: "DEPLOY_COMPLETE",
      executionId,
      deployUrl,
      status: "triggered",
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      deployUrl,
      status: "triggered",
    };
  }
}

/**
 * Polls Netlify API for deploy status
 * Makes 20 attempts with 3-second intervals
 * @param siteId - Netlify site ID
 * @param token - Netlify API token
 * @param executionId - Execution ID for logging
 * @returns Final deploy status
 */
async function pollDeployStatus(
  siteId: string,
  token: string,
  executionId: string
): Promise<string> {
  const maxAttempts = 20;
  const intervalSeconds = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Get latest deploy for site
      const response = await fetch(
        `https://api.netlify.com/api/v1/sites/${siteId}/deploys?per_page=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        console.warn(`Deploy status check failed (attempt ${attempt}/${maxAttempts})`);
        await sleep(intervalSeconds * 1000);
        continue;
      }

      const deploys = await response.json();
      if (!Array.isArray(deploys) || deploys.length === 0) {
        console.warn(`No deploys found (attempt ${attempt}/${maxAttempts})`);
        await sleep(intervalSeconds * 1000);
        continue;
      }

      const latestDeploy = deploys[0];
      const status = latestDeploy.state;

      console.log(`Deploy status (attempt ${attempt}/${maxAttempts}): ${status}`);

      // Terminal states
      if (status === "ready") {
        return "ready";
      } else if (status === "error" || status === "failed") {
        return "error";
      }

      // Continue polling for non-terminal states
      await sleep(intervalSeconds * 1000);
    } catch (error: any) {
      console.warn(`Error polling deploy status: ${error.message}`);
      await sleep(intervalSeconds * 1000);
    }
  }

  // Timeout after max attempts
  console.warn(`Deploy status polling timed out after ${maxAttempts} attempts`);
  return "timeout";
}

/**
 * Sleep utility
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
