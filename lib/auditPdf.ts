import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
import { readLedger } from "@/lib/ledger";

export async function generateAuditPdfBuffer({ take = 500 }: { take?: number } = {}) {
  const entries = await readLedger(take);

  const doc = new PDFDocument({ autoFirstPage: true, margin: 48 });
  const stream = new PassThrough();
  const chunks: Buffer[] = [];

  stream.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));

  doc.pipe(stream);

  doc.fontSize(18).text("Bickford Execution Audit", { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10).fillColor("gray").text(`entries: ${entries.length}`);
  doc.fillColor("black");

  for (const e of entries) {
    doc.moveDown();
    doc.fontSize(10).text(JSON.stringify(e, null, 2));
  }

  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on("end", resolve);
    stream.on("error", reject);
  });

  return Buffer.concat(chunks);
}
