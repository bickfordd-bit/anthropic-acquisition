import path from "path";
import { ensureDir, writeText } from "./dataRoom/fsUtils";

export async function exportMetrics(outRoot: string) {
  const metricsDir = path.join(outRoot, "METRICS");
  await ensureDir(metricsDir);

  // Placeholders: wire these to your analytics pipeline if/when available.
  await writeText(path.join(metricsDir, "mt-growth.csv"), "time,Mt\n");
  await writeText(path.join(metricsDir, "ttv-deltas.csv"), "decision,deltaTTV\n");
  await writeText(path.join(metricsDir, "burden-collapse.csv"), "time,Bt\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.env.DATA_ROOM_OUT ?? path.join(process.cwd(), "bickford-acquisition-data-room");
  exportMetrics(out).then(() => {
    // eslint-disable-next-line no-console
    console.log(`Metrics exported to ${out}/METRICS`);
  });
}
