// scripts/promoteCompoundingCanon.ts
import { prisma } from "@/lib/prisma";
import { appendLedger } from "@/lib/ledger";
import { stableStringify } from "@/lib/hash";
import { COMPOUNDING_INTELLIGENCE_CANON } from "@/canon/compounding-intelligence";

async function promote() {
  const ledger = await appendLedger({ type: "canon_promotion", ...COMPOUNDING_INTELLIGENCE_CANON });

  await prisma.canonEntry.create({
    data: {
      title: COMPOUNDING_INTELLIGENCE_CANON.title,
      content: stableStringify(COMPOUNDING_INTELLIGENCE_CANON),
      ledgerHash: ledger.hash,
    }
  });

  console.log("✅ Compounding Intelligence canon promoted");
}

promote();
