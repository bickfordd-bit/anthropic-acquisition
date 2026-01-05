import crypto from "crypto";
import { generateAuditPdfBuffer } from "@/lib/auditPdf";

export const runtime = "nodejs";

function requireAuth(req: Request) {
  const token = process.env.DATA_ROOM_TOKEN;
  if (!token) {
    throw new Error(
      "DATA_ROOM_TOKEN is not set. Refusing to export audit PDF without explicit server-side authorization.",
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

    const buf = await generateAuditPdfBuffer({ take: 500 });
    const sha256 = crypto.createHash("sha256").update(buf).digest("hex");

    return new Response(buf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="bickford-audit-pack.pdf"',
        "X-Content-SHA256": sha256,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    const status = err?.statusCode ?? 500;
    return new Response(err?.message ?? "Audit PDF export failed", { status });
  }
}
