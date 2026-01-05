import { ClaudeToolWrapper } from "@bickford/claude-hook/tool-wrapper";

async function demo() {
  const tool = new ClaudeToolWrapper({
    canonRules: ["financial-compliance"],
  });

  // Example 1: Allowed action
  console.log("🧪 Test 1: Small transfer (should be allowed)");
  const result1 = await tool.execute({
    name: "transfer_funds",
    input: { amount: 100, recipient: "acct-123" },
  });
  console.log("  Allowed:", result1.allowed);
  console.log("  Proof:", result1.ledgerHash);

  // Example 2: Denied action
  console.log("\n🧪 Test 2: Large transfer (should be denied)");
  const result2 = await tool.execute({
    name: "transfer_funds",
    input: { amount: 1_000_000, recipient: "unknown" },
  });
  console.log("  Allowed:", result2.allowed);
  console.log("  Reason:", result2.reason);
  console.log("  Proof:", result2.ledgerHash);
}

demo().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
