import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import type { EnvironmentSpec } from "./intent-processor";

export type GenerationMode = "plan" | "execute";

export interface GenerateResult {
  envPath: string;
  mode: GenerationMode;
  actions: Array<{ step: string; command?: string }>;
}

export interface GeneratorOptions {
  workspaceRoot?: string;
  mode?: GenerationMode;
  templateSourceRoot?: string;
}

const DEFAULT_IGNORES = new Set([
  ".git",
  ".next",
  "node_modules",
  ".env",
  ".env.local",
  "bickford-acquisition-data-room.zip",
  "bickford-acquisition-data-room",
]);

export class EnvironmentGenerator {
  private workspaceRoot: string;
  private mode: GenerationMode;
  private templateSourceRoot: string;
  private actions: GenerateResult["actions"] = [];

  constructor(options: GeneratorOptions = {}) {
    this.workspaceRoot =
      options.workspaceRoot ?? process.env.BICKFORD_WORKSPACE_ROOT ?? "/tmp/bickford-envs";
    this.mode = options.mode ?? (process.env.BICKFORD_AUTONOMOUS_MODE === "execute" ? "execute" : "plan");
    this.templateSourceRoot =
      options.templateSourceRoot ?? process.env.BICKFORD_TEMPLATE_SOURCE_ROOT ?? process.cwd();

    fs.mkdirSync(this.workspaceRoot, { recursive: true });
  }

  async generate(spec: EnvironmentSpec): Promise<GenerateResult> {
    this.actions = [];

    const envPath = path.join(this.workspaceRoot, spec.repoName);

    await this.createRepoStructure(envPath, spec);
    await this.installDependencies(envPath);
    await this.initializeCanon(envPath, spec);
    await this.setupLedger(envPath);
    await this.configureDeployment(envPath, spec);
    await this.setupCICD(envPath, spec);
    await this.initializeGit(envPath, spec);
    await this.createGitHubRepo(envPath, spec);
    await this.deploy(envPath, spec);

    return { envPath, mode: this.mode, actions: this.actions };
  }

  private addAction(step: string, command?: string) {
    this.actions.push({ step, command });
  }

  private run(command: string, args: string[], cwd: string, step: string) {
    this.addAction(step, [command, ...args].join(" "));
    if (this.mode !== "execute") return;

    // Hard allowlist: never run arbitrary shells from intent-derived content.
    const allowed = new Set(["pnpm", "git", "gh"]);
    if (!allowed.has(command)) {
      throw new Error(`Blocked unsafe command: ${command}`);
    }

    execFileSync(command, args, {
      cwd,
      stdio: "inherit",
      env: process.env,
    });
  }

  private async createRepoStructure(envPath: string, spec: EnvironmentSpec): Promise<void> {
    this.addAction("create_repo_structure", `copy from ${this.templateSourceRoot} -> ${envPath}`);

    if (this.mode === "execute") {
      if (fs.existsSync(envPath)) {
        throw new Error(`Target path already exists: ${envPath}`);
      }
      fs.mkdirSync(envPath, { recursive: true });
      this.copyDir(this.templateSourceRoot, envPath, DEFAULT_IGNORES);
    }

    // Always (plan or execute) write/overwrite a minimal marker + README.
    fs.mkdirSync(path.join(envPath, ".bickford"), { recursive: true });

    const readme = this.generateREADME(spec);
    fs.writeFileSync(path.join(envPath, "README.md"), readme);

    fs.writeFileSync(
      path.join(envPath, ".bickford", "environment-spec.json"),
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          spec,
          mode: this.mode,
        },
        null,
        2,
      ),
    );
  }

  private async installDependencies(envPath: string): Promise<void> {
    this.addAction("install_dependencies", "pnpm install");
    if (this.mode !== "execute") return;
    this.run("pnpm", ["install"], envPath, "install_dependencies");
  }

  private async initializeCanon(envPath: string, spec: EnvironmentSpec): Promise<void> {
    this.addAction("initialize_canon", "write generated canon file");

    const canonDir = path.join(envPath, "canon", "generated");
    fs.mkdirSync(canonDir, { recursive: true });

    const fileName = `${spec.repoName}.canon.ts`;
    fs.writeFileSync(path.join(canonDir, fileName), this.generateCanonRules(spec));
  }

  private async setupLedger(envPath: string): Promise<void> {
    this.addAction("setup_ledger", "pnpm run prisma:generate && pnpm run prisma:migrate");
    if (this.mode !== "execute") return;

    // Use repo scripts if present; otherwise skip silently.
    const pkgPath = path.join(envPath, "package.json");
    if (!fs.existsSync(pkgPath)) return;

    this.run("pnpm", ["run", "prisma:generate"], envPath, "setup_ledger(prisma:generate)");
    this.run("pnpm", ["run", "prisma:migrate"], envPath, "setup_ledger(prisma:migrate)");
  }

  private async configureDeployment(envPath: string, spec: EnvironmentSpec): Promise<void> {
    this.addAction("configure_deployment", `write config for ${spec.targetPlatform}`);

    if (spec.targetPlatform === "netlify") this.generateNetlifyConfig(envPath);
    if (spec.targetPlatform === "vercel") this.generateVercelConfig(envPath);
    if (spec.targetPlatform === "railway") this.generateRailwayConfig(envPath);
    if (spec.targetPlatform === "self-hosted") this.generateDockerConfig(envPath);
  }

  private async setupCICD(envPath: string, spec: EnvironmentSpec): Promise<void> {
    this.addAction("setup_cicd", "write .github/workflows/autonomous-deploy.yml");

    const workflowsPath = path.join(envPath, ".github", "workflows");
    fs.mkdirSync(workflowsPath, { recursive: true });
    fs.writeFileSync(
      path.join(workflowsPath, "autonomous-deploy.yml"),
      this.generateGitHubActionsWorkflow(spec),
    );
  }

  private async initializeGit(envPath: string, spec: EnvironmentSpec): Promise<void> {
    this.addAction("initialize_git", "git init && git add && git commit && git branch -M main");

    const allow = process.env.BICKFORD_AUTONOMOUS_ENABLE_GIT === "true";
    if (this.mode !== "execute" || !allow) return;

    this.run("git", ["init"], envPath, "initialize_git(init)");
    this.run("git", ["add", "."], envPath, "initialize_git(add)");
    this.run(
      "git",
      ["commit", "-m", `Initial commit: ${spec.projectName}`],
      envPath,
      "initialize_git(commit)",
    );
    this.run("git", ["branch", "-M", "main"], envPath, "initialize_git(branch)");
  }

  private async createGitHubRepo(envPath: string, spec: EnvironmentSpec): Promise<void> {
    this.addAction("create_github_repo", `gh repo create ${spec.repoOwner}/${spec.repoName} ...`);

    const allow = process.env.BICKFORD_AUTONOMOUS_ENABLE_GITHUB === "true";
    if (this.mode !== "execute" || !allow) return;

    const repoFullName = `${spec.repoOwner}/${spec.repoName}`;
    this.run(
      "gh",
      ["repo", "create", repoFullName, "--public", "--source=.", "--remote=origin", "--push"],
      envPath,
      "create_github_repo",
    );
  }

  private async deploy(envPath: string, spec: EnvironmentSpec): Promise<void> {
    this.addAction("deploy", `deploy to ${spec.targetPlatform}`);

    const allow = process.env.BICKFORD_AUTONOMOUS_ENABLE_DEPLOY === "true";
    if (this.mode !== "execute" || !allow) return;

    if (spec.targetPlatform === "netlify") {
      this.run("pnpm", ["exec", "netlify", "deploy", "--build", "--prod"], envPath, "deploy(netlify)");
    }
    if (spec.targetPlatform === "vercel") {
      this.run("pnpm", ["exec", "vercel", "--prod"], envPath, "deploy(vercel)");
    }
    if (spec.targetPlatform === "railway") {
      this.run("pnpm", ["exec", "railway", "up"], envPath, "deploy(railway)");
    }
  }

  private generateREADME(spec: EnvironmentSpec): string {
    const enabledFeatures = Object.entries(spec.features)
      .filter(([, enabled]) => enabled)
      .map(([k]) => `- ${k.replace(/([A-Z])/g, " $1").trim()}`)
      .join("\n");

    return `# ${spec.projectName}

${spec.description}

## Features

${enabledFeatures || "- (none)"}

## Canon Rules

${spec.canonRules.map((r) => `- ${r}`).join("\n")}

## Compliance Frameworks

${spec.complianceFrameworks.map((f) => `- ${f}`).join("\n")}

## Deployment

Target platform: ${spec.targetPlatform}

## Notes

This repository was generated from an intent by the Bickford Autonomous Environment Template.
Generated: ${new Date().toISOString()}
`;
  }

  private generateCanonRules(spec: EnvironmentSpec): string {
    return `// Auto-generated Canon rules for ${spec.projectName}

export const canon = {
  rules: ${JSON.stringify(spec.canonRules, null, 2)},

  evaluate(action: string, context: unknown): { allowed: boolean; rule: string; rationale: string } {
    if (this.rules.includes('no-pii') && JSON.stringify(context).includes('ssn')) {
      return {
        allowed: false,
        rule: 'no-pii',
        rationale: 'PII detected in execution context',
      };
    }

    void action;
    return {
      allowed: true,
      rule: 'default-safety',
      rationale: 'No canon violations detected',
    };
  },
};
`;
  }

  private generateNetlifyConfig(envPath: string): void {
    const config = `[build]\n  command = "pnpm run build"\n  publish = ".next"\n\n[build.environment]\n  NODE_VERSION = "20"\n\n[[plugins]]\n  package = "@netlify/plugin-nextjs"\n`;
    fs.writeFileSync(path.join(envPath, "netlify.toml"), config);
  }

  private generateVercelConfig(envPath: string): void {
    const config = {
      version: 2,
      framework: "nextjs",
      buildCommand: "pnpm run build",
    };
    fs.writeFileSync(path.join(envPath, "vercel.json"), JSON.stringify(config, null, 2));
  }

  private generateRailwayConfig(envPath: string): void {
    const config = {
      build: {
        builder: "NIXPACKS",
        buildCommand: "pnpm install && pnpm run build",
      },
      deploy: {
        startCommand: "pnpm start",
        restartPolicyType: "ON_FAILURE",
      },
    };
    fs.writeFileSync(path.join(envPath, "railway.json"), JSON.stringify(config, null, 2));
  }

  private generateDockerConfig(envPath: string): void {
    const dockerfile = `FROM node:20-alpine\nRUN corepack enable\nWORKDIR /app\nCOPY package.json pnpm-lock.yaml ./\nRUN pnpm install --frozen-lockfile\nCOPY . .\nRUN pnpm run build\nEXPOSE 3000\nCMD [\"pnpm\", \"start\"]\n`;
    fs.writeFileSync(path.join(envPath, "Dockerfile"), dockerfile);
  }

  private generateGitHubActionsWorkflow(spec: EnvironmentSpec): string {
    return `name: Autonomous Deploy\n\non:\n  push:\n    branches: [main]\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: pnpm/action-setup@v2\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 20\n          cache: pnpm\n      - run: pnpm install\n      - run: pnpm run build\n      - name: Deploy\n        run: echo \"Deploy to ${spec.targetPlatform}\"\n`;
  }

  private copyDir(srcDir: string, destDir: string, ignores: Set<string>) {
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });

    for (const entry of entries) {
      if (ignores.has(entry.name)) continue;

      const src = path.join(srcDir, entry.name);
      const dest = path.join(destDir, entry.name);

      if (entry.isDirectory()) {
        fs.mkdirSync(dest, { recursive: true });
        this.copyDir(src, dest, ignores);
        continue;
      }

      if (entry.isFile()) {
        fs.copyFileSync(src, dest);
      }
    }
  }
}

