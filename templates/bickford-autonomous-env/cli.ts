#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { BickfordWebUIIntegration } from "./web-ui-integration";
import type { BickfordIntent } from "./intent-processor";

type Platform = "netlify" | "vercel" | "railway" | "self-hosted";

type Args = {
  command?: string;
  prompt?: string;
  userId: string;
  platform?: Platform;
  mode: "plan" | "execute";
  repoOwner?: string;
  projectName?: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = {
    userId: "cli-user",
    mode: "plan",
  };

  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];

    if (token === "--user" || token === "-u") {
      args.userId = argv[++i] ?? args.userId;
      continue;
    }
    if (token === "--platform" || token === "-p") {
      args.platform = argv[++i] as Platform | undefined;
      continue;
    }
    if (token === "--mode") {
      const mode = argv[++i];
      if (mode === "plan" || mode === "execute") args.mode = mode;
      continue;
    }
    if (token === "--execute") {
      args.mode = "execute";
      continue;
    }
    if (token === "--repo-owner") {
      args.repoOwner = argv[++i];
      continue;
    }
    if (token === "--project-name") {
      args.projectName = argv[++i];
      continue;
    }

    positional.push(token);
  }

  args.command = positional[0];
  args.prompt = positional.slice(1).join(" ").trim() || undefined;

  return args;
}

function printHelp() {
  console.log(`bickford-create\n\nUsage:\n  tsx templates/bickford-autonomous-env/cli.ts create <prompt> [options]\n\nOptions:\n  -u, --user <id>           user id (default: cli-user)\n  -p, --platform <platform> netlify|vercel|railway|self-hosted\n  --mode <plan|execute>     default: plan\n  --execute                 shortcut for --mode execute\n  --repo-owner <owner>      GitHub owner/org (used for planning)\n  --project-name <name>     explicit project name\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.command || args.command === "--help" || args.command === "-h" || args.command === "help") {
    printHelp();
    process.exit(0);
  }

  if (args.command !== "create") {
    console.error(`Unknown command: ${args.command}`);
    printHelp();
    process.exit(1);
  }

  if (!args.prompt) {
    console.error("Missing prompt.");
    printHelp();
    process.exit(1);
  }

  const intent: BickfordIntent = {
    id: randomUUID(),
    userId: args.userId,
    prompt: args.prompt,
    timestamp: new Date().toISOString(),
    metadata: {
      targetPlatform: args.platform,
      repoOwner: args.repoOwner,
      projectName: args.projectName,
    },
  };

  const integration = new BickfordWebUIIntegration();
  const result = await integration.processIntentFromUI(intent, { mode: args.mode });

  if (result.success) {
    console.log(`\nSuccess (${args.mode})`);
    console.log(`Intent: ${result.intentId}`);
    console.log(`Path:   ${result.envPath}`);
    console.log(`URL:    ${result.deploymentUrl}`);

    if (result.actions && result.actions.length > 0) {
      console.log("\nPlanned actions:");
      for (const a of result.actions) {
        console.log(`- ${a.step}${a.command ? `: ${a.command}` : ""}`);
      }
    }

    process.exit(0);
  }

  console.error(`\nFailed: ${result.error}`);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
