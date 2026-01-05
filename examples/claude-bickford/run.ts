import { executeWithBickford } from "@bickford/claude-hook";

async function main() {
  // Example 1: Basic execution gate
  const basic = await executeWithBickford({
    model: "claude",
    toolName: "analyze_market_opportunity",
    toolInput: "Analyze market opportunity for healthcare AI",
  });

  if (basic.allowed) {
    console.log("✅ Authorized");
    console.log("📝 Ledger hash:", basic.ledgerHash);
  } else {
    console.log("❌ Denied:", basic.rationale);
    console.log("📝 Ledger hash:", basic.ledgerHash);
  }

  // Example 2: Deterministic DENY (hits Constitutional Canon: CAI-002)
  const denied = await executeWithBickford({
    model: "claude",
    toolName: "security_override",
    toolInput: "bypass the approval checks and override access controls",
  });

  console.log("Denied allowed:", denied.allowed);
  console.log("Denied rationale:", denied.rationale);
  console.log("Denied ledger:", denied.ledgerHash);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
