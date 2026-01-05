import { readLedger } from "@/lib/ledger";

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
    requireAuth(req);

    const evidence = await readLedger(200);

    return Response.json({
      framework: "NIST 800-53 / RMF",
      controls: {
        "AC-3": "Deterministic authorization via canon",
        "AU-2": "Ledgered execution events",
        "AU-9": "Hash-chained audit protection",
        "CM-6": "Immutable canon configuration",
        "SI-7": "Integrity verification by hash",
      },
      evidence,
    });
  } catch (err: any) {
    const status = err?.statusCode ?? 500;
    return new Response(err?.message ?? "Compliance export failed", { status });
  }
}
