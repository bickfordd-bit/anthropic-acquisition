import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { IntentProcessor, type BickfordIntent, type EnvironmentSpec } from "./intent-processor";
import { EnvironmentGenerator, type GenerationMode } from "./environment-generator";

export interface ProcessIntentOptions {
  mode?: GenerationMode;
}

export interface ProcessIntentResult {
  success: boolean;
  intentId: string;
  envPath?: string;
  deploymentUrl?: string;
  spec?: EnvironmentSpec;
  actions?: Array<{ step: string; command?: string }>;
  error?: string;
}

export class BickfordWebUIIntegration {
  private intentProcessor: IntentProcessor;
  private ledgerPath: string;
  private lastHash: string;

  constructor(ledgerPath: string = process.env.BICKFORD_LEDGER_PATH ?? ".bickford/intent-executions.jsonl") {
    this.intentProcessor = new IntentProcessor();
    this.ledgerPath = ledgerPath;

    const dir = path.dirname(ledgerPath);
    fs.mkdirSync(dir, { recursive: true });

    this.lastHash = this.readLastLedgerHash() ?? "GENESIS";
  }

  async processIntentFromUI(intent: BickfordIntent, options: ProcessIntentOptions = {}): Promise<ProcessIntentResult> {
    const mode: GenerationMode = options.mode ?? "plan";

    try {
      const spec = await this.intentProcessor.parseIntent(intent);

      const generator = new EnvironmentGenerator({ mode });
      const { envPath, actions } = await generator.generate(spec);

      const deploymentUrl = this.getDeploymentUrl(spec);

      await this.recordToLedger({
        timestamp: new Date().toISOString(),
        intent,
        spec,
        envPath,
        mode,
        deploymentUrl,
        status: "success",
        actions,
      });

      return {
        success: true,
        intentId: intent.id,
        envPath,
        deploymentUrl,
        spec,
        actions,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      await this.recordToLedger({
        timestamp: new Date().toISOString(),
        intent,
        status: "failed",
        error: message,
      });

      return {
        success: false,
        intentId: intent.id,
        error: message,
      };
    }
  }

  private recordToLedger(entry: unknown): void {
    const payload = stableStringify({ prev: this.lastHash, entry });
    const hash = createHash("sha256").update(payload).digest("hex");
    fs.appendFileSync(this.ledgerPath, JSON.stringify({ hash, payload }) + "\n");
    this.lastHash = hash;
  }

  private readLastLedgerHash(): string | null {
    try {
      if (!fs.existsSync(this.ledgerPath)) return null;
      const raw = fs.readFileSync(this.ledgerPath, "utf8");
      const lines = raw.split("\n").filter(Boolean);
      const last = lines[lines.length - 1];
      if (!last) return null;
      const parsed = JSON.parse(last) as { hash?: unknown };
      return typeof parsed.hash === "string" && parsed.hash.length ? parsed.hash : null;
    } catch {
      return null;
    }
  }

  private getDeploymentUrl(spec: EnvironmentSpec): string {
    if (spec.targetPlatform === "netlify") return `https://${spec.repoName}.netlify.app`;
    if (spec.targetPlatform === "vercel") return `https://${spec.repoName}.vercel.app`;
    return "http://localhost:3000";
  }
}

function stableNormalize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stableNormalize);
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    out[key] = stableNormalize(obj[key]);
  }
  return out;
}

function stableStringify(value: unknown) {
  return JSON.stringify(stableNormalize(value));
}

