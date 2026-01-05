import fs from "fs";
import path from "path";

import { readLedger, appendLedger } from "../lib/ledger";
import {
  generateAuditEvidence,
  renderAU2Markdown,
  renderAU3Json,
  renderAU9HashProof,
} from "../packages/compliance/src/nistAuditArtifacts";

async function main() {
  const outDir = path.join(process.cwd(), "bickford-acquisition-data-room", "COMPLIANCE");
  fs.mkdirSync(outDir, { recursive: true });

  const ledgerRows = await readLedger(500);
  const evidence = generateAuditEvidence(ledgerRows);

  const au2 = renderAU2Markdown(evidence);
  const au3 = renderAU3Json(evidence);
  const au9 = renderAU9HashProof(evidence);

  fs.writeFileSync(path.join(outDir, "AU-2.md"), au2);
  fs.writeFileSync(path.join(outDir, "AU-3.json"), JSON.stringify(au3, null, 2) + "\n");
  fs.writeFileSync(path.join(outDir, "AU-9-hash-proof.txt"), au9);

  await appendLedger({
    type: "compliance_artifacts",
    artifacts: ["AU-2.md", "AU-3.json", "AU-9-hash-proof.txt"],
    outDir: "bickford-acquisition-data-room/COMPLIANCE",
    count: evidence.length,
  });

  // eslint-disable-next-line no-console
  console.log("✅ Compliance artifacts written", { outDir, records: evidence.length });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
