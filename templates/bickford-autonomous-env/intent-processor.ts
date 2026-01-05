export interface BickfordIntent {
  id: string;
  userId: string;
  prompt: string;
  timestamp: string;
  metadata?: {
    projectName?: string;
    repoOwner?: string;
    repoName?: string;
    targetPlatform?: string;
    complianceFrameworks?: string[];
    canonRules?: string[];
    features?: Partial<EnvironmentSpec["features"]>;
  };
}

export interface EnvironmentSpec {
  repoName: string;
  repoOwner: string;
  projectName: string;
  description: string;
  targetPlatform: "netlify" | "vercel" | "railway" | "self-hosted";
  canonRules: string[];
  complianceFrameworks: string[];
  features: {
    executionAuthority: boolean;
    multiAgentArbitration: boolean;
    optrScoring: boolean;
    ledgerRecording: boolean;
    complianceAutomation: boolean;
    demoGeneration: boolean;
  };
}

export class IntentProcessor {
  async parseIntent(intent: BickfordIntent): Promise<EnvironmentSpec> {
    const projectName = this.extractProjectName(intent);
    const repoName = this.sanitizeRepoName(intent.metadata?.repoName ?? projectName);

    const targetPlatform = this.inferPlatform(intent);
    const canonRules = this.extractCanonRules(intent);
    const complianceFrameworks = this.extractComplianceFrameworks(intent);
    const features = this.inferFeatures(intent);

    const repoOwner = intent.metadata?.repoOwner ?? intent.userId;

    return {
      repoName,
      repoOwner,
      projectName,
      description: `Autonomous Bickford environment for: ${intent.prompt}`,
      targetPlatform,
      canonRules,
      complianceFrameworks,
      features,
    };
  }

  private extractProjectName(intent: BickfordIntent): string {
    if (intent.metadata?.projectName && intent.metadata.projectName.trim().length > 0) {
      return intent.metadata.projectName.trim();
    }

    const words = intent.prompt
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 5);

    const candidate = words.join("-");
    return this.sanitizeRepoName(candidate) || "bickford-environment";
  }

  private sanitizeRepoName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private inferPlatform(intent: BickfordIntent): EnvironmentSpec["targetPlatform"] {
    const explicit = intent.metadata?.targetPlatform?.toLowerCase();
    if (explicit === "netlify" || explicit === "vercel" || explicit === "railway" || explicit === "self-hosted") {
      return explicit;
    }

    const prompt = intent.prompt.toLowerCase();
    if (prompt.includes("netlify")) return "netlify";
    if (prompt.includes("vercel")) return "vercel";
    if (prompt.includes("railway")) return "railway";
    if (prompt.includes("self-hosted") || prompt.includes("vps")) return "self-hosted";

    return "netlify";
  }

  private extractCanonRules(intent: BickfordIntent): string[] {
    const fromMetadata = intent.metadata?.canonRules?.filter(Boolean);
    if (fromMetadata && fromMetadata.length > 0) return fromMetadata;

    const rules: string[] = [];
    const prompt = intent.prompt.toLowerCase();

    if (prompt.includes("pii") || prompt.includes("privacy")) rules.push("no-pii");
    if (prompt.includes("phi")) rules.push("phi-protection");
    if (prompt.includes("healthcare") || prompt.includes("hipaa")) rules.push("healthcare-compliance");
    if (prompt.includes("finance") || prompt.includes("trading") || prompt.includes("sec")) rules.push("financial-compliance");
    if (prompt.includes("government") || prompt.includes("dod") || prompt.includes("rmf")) rules.push("government-compliance");

    return rules.length > 0 ? rules : ["default-safety"];
  }

  private extractComplianceFrameworks(intent: BickfordIntent): string[] {
    const fromMetadata = intent.metadata?.complianceFrameworks?.filter(Boolean);
    if (fromMetadata && fromMetadata.length > 0) return fromMetadata;

    const frameworks: string[] = [];
    const prompt = intent.prompt.toLowerCase();

    if (prompt.includes("nist") || prompt.includes("rmf") || prompt.includes("dod")) frameworks.push("NIST-RMF");
    if (prompt.includes("hipaa")) frameworks.push("HIPAA");
    if (prompt.includes("sox")) frameworks.push("SOX");
    if (prompt.includes("gdpr")) frameworks.push("GDPR");
    if (prompt.includes("soc 2") || prompt.includes("soc2")) frameworks.push("SOC2");

    return frameworks.length > 0 ? frameworks : ["NIST-RMF"];
  }

  private inferFeatures(intent: BickfordIntent): EnvironmentSpec["features"] {
    const prompt = intent.prompt.toLowerCase();

    const inferred: EnvironmentSpec["features"] = {
      executionAuthority: true,
      multiAgentArbitration: prompt.includes("multi-agent") || prompt.includes("arbitration"),
      optrScoring: prompt.includes("optr") || prompt.includes("scoring") || prompt.includes("opportunity"),
      ledgerRecording: true,
      complianceAutomation: prompt.includes("compliance") || prompt.includes("audit"),
      demoGeneration: prompt.includes("demo") || prompt.includes("presentation"),
    };

    return {
      ...inferred,
      ...(intent.metadata?.features ?? {}),
    };
  }
}
