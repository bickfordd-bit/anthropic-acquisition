import { readLedger } from "@/lib/ledger";
import {
  generateAuditEvidence,
  renderAU2Markdown,
  renderAU3Json,
  renderAU9HashProof,
} from "@/packages/compliance/src/nistAuditArtifacts";
import { enforceRateLimit, safeErrorMessage } from "@/lib/apiSecurity";

export const runtime = "nodejs";

function requireAuth(req: Request) {
  const token = process.env.DATA_ROOM_TOKEN;
  if (!token) {
    throw new Error(
      "DATA_ROOM_TOKEN is not set. Refusing to export compliance evidence without explicit server-side authorization.",
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  const provided = match?.[1] ?? "";
  if (!provided || provided !== token) {
    const err = new Error("Unauthorized");
    (err as any).statusCode = 401;
    throw err;
  }
}

export async function GET(req: Request) {
  try {
    const limited = enforceRateLimit(req, { keyPrefix: "compliance:artifacts", limit: 10, windowMs: 60_000 });
    if (limited) return limited;

    requireAuth(req);

    const rows = await readLedger(500);
    const evidence = generateAuditEvidence(rows);

    return Response.json({
      generatedAt: new Date().toISOString(),
      artifacts: {
        "AU-2.md": renderAU2Markdown(evidence),
        "AU-3.json": renderAU3Json(evidence),
        "AU-9-hash-proof.txt": renderAU9HashProof(evidence),
      },
      counts: {
        records: evidence.length,
      },
    });
  } catch (err: any) {
    const status = err?.statusCode ?? 500;
    const message = status === 401 ? "Unauthorized" : safeErrorMessage(err);
    return new Response(message, { status });
  }
}
