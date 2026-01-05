import path from "path";
import { exportCanon } from "./exportCanon";
import { exportLedger } from "./exportLedger";
import { exportOPTRProofs } from "./exportOPTRProofs";
import { exportNonInterference } from "./exportNonInterference";
import { exportReplayProof } from "./exportReplayProof";
import { exportMetrics } from "./exportMetrics";
import { ensureDir, fileSha256, listFilesRecursively, writeJson, writeText } from "./dataRoom/fsUtils";
import { getGitInfo } from "./dataRoom/gitInfo";

type Manifest = {
  schemaVersion: 1;
  project: string;
  exportType: string;
  generatedAt: string;
  git?: { commit?: string; branch?: string; dirty?: boolean };
  contents: string[];
  auditGuarantees: string[];
  artifacts: Array<{ path: string; bytes: number; sha256: string }>;
};

function legalText(): { immutability: string; authorship: string; audit: string } {
  return {
    immutability:
      "Immutability statement\n\n" +
      "This package is generated from an append-only ledger (LedgerEntry) and a promoted canon (CanonEntry).\n" +
      "All exported files are accompanied by SHA-256 hashes in MANIFEST.json.\n" +
      "Any modification to content or ordering is detectable by re-running verification.\n",
    authorship:
      "Authorship attestation\n\n" +
      "The seller attests that the content in this export was produced by the Bickford system and recorded into the ledger/canon database.\n" +
      "Auditors should treat this document as a human statement; trust is not required because verification is cryptographic.\n",
    audit:
      "Audit instructions\n\n" +
      "Prereqs:\n" +
      "- Node.js + npm\n" +
      "- Access to the SQLite DB file referenced by DATABASE_URL\n\n" +
      "Verify exported artifacts:\n" +
      "1) npm install\n" +
      "2) export DATABASE_URL='file:./dev.db'  (or your provided db path)\n" +
      "3) npm run data-room:export\n" +
      "4) npm run data-room:verify\n\n" +
      "Verification checks:\n" +
      "- MANIFEST.json file hashes match on-disk bytes\n" +
      "- CANON/canon-index.json hashes match CANON/*.json payloads (canonical JSON hashing)\n" +
      "- LEDGER/ledger-export.jsonl hashes match stored LedgerEntry.hash (system hash semantics)\n",
  };
}

function dataRoomReadme(): string {
  return (
    "# Bickford Acquisition Data Room\n\n" +
    "This package contains cryptographically verifiable proof of Bickford’s canon + ledger system.\n\n" +
    "Nothing here requires trust in the seller.\n\n" +
    "You may:\n" +
    "- Verify all file hashes via MANIFEST.json\n" +
    "- Validate canon integrity via CANON/canon-index.json + CANON/canon-hash-chain.txt\n" +
    "- Validate ledger integrity via LEDGER/ledger-export.jsonl + LEDGER/ledger-hash-chain.txt\n" +
    "- Inspect promotion proofs and safety checks in PROOFS/\n\n" +
    "If any artifact fails verification, the export is invalid.\n\n" +
    "Execution is law.\n" +
    "Memory is structure.\n" +
    "Learning is monotonic.\n"
  );
}

export async function exportDataRoom(outRoot: string) {
  await ensureDir(outRoot);
  await ensureDir(path.join(outRoot, "CANON"));
  await ensureDir(path.join(outRoot, "LEDGER"));
  await ensureDir(path.join(outRoot, "PROOFS"));
  await ensureDir(path.join(outRoot, "METRICS"));
  await ensureDir(path.join(outRoot, "LEGAL"));

  await exportCanon(outRoot);
  await exportLedger(outRoot);
  await exportOPTRProofs(outRoot);
  await exportNonInterference(outRoot);
  await exportReplayProof(outRoot);
  await exportMetrics(outRoot);

  await writeText(path.join(outRoot, "README.md"), dataRoomReadme());

  const legal = legalText();
  await writeText(path.join(outRoot, "LEGAL/immutability-statement.txt"), legal.immutability);
  await writeText(path.join(outRoot, "LEGAL/authorship-attestation.txt"), legal.authorship);
  await writeText(path.join(outRoot, "LEGAL/audit-instructions.txt"), legal.audit);

  // Build MANIFEST.json last, so it can include all other artifacts.
  const files = await listFilesRecursively(outRoot);
  const artifacts: Array<{ path: string; bytes: number; sha256: string }> = [];

  for (const f of files) {
    if (path.basename(f) === "MANIFEST.json") continue;
    const rel = path.relative(outRoot, f).split(path.sep).join("/");
    const { bytes, sha256 } = await fileSha256(f);
    artifacts.push({ path: rel, bytes, sha256 });
  }

  artifacts.sort((a, b) => a.path.localeCompare(b.path));

  const manifest: Manifest = {
    schemaVersion: 1,
    project: "Bickford Technologies, Inc.",
    exportType: "Acquisition Data Room",
    generatedAt: new Date().toISOString(),
    git: getGitInfo(),
    contents: [
      "Canon (immutable)",
      "Ledger (append-only)",
      "OPTR proofs",
      "Non-interference proofs",
      "Replay verification",
      "Compounding intelligence metrics",
    ],
    auditGuarantees: [
      "Tamper-evident hashes",
      "Deterministic replay (where session IDs are present)",
      "Runtime safety enforcement (where checks are present)",
      "No silent edits without detection",
    ],
    artifacts,
  };

  await writeJson(path.join(outRoot, "MANIFEST.json"), manifest);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.env.DATA_ROOM_OUT ?? path.join(process.cwd(), "bickford-acquisition-data-room");
  exportDataRoom(out).then(() => {
    // eslint-disable-next-line no-console
    console.log(`Data room export complete: ${out}`);
  });
}
