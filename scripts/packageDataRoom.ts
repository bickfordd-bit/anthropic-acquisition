import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import crypto from "crypto";
import { exportDataRoom } from "./exportDataRoom";

function hasCommand(cmd: string): boolean {
  try {
    execFileSync("which", [cmd], { stdio: ["ignore", "ignore", "ignore"] });
    return true;
  } catch {
    return false;
  }
}

function sha256File(filePath: string): string {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function main() {
  const outDir = process.env.DATA_ROOM_OUT ?? path.join(process.cwd(), "bickford-acquisition-data-room");
  await exportDataRoom(outDir);

  const baseName = path.basename(outDir);
  const zipPath = path.join(process.cwd(), `${baseName}.zip`);
  const tarPath = path.join(process.cwd(), `${baseName}.tar.gz`);

  // Clean old artifacts
  for (const p of [zipPath, `${zipPath}.sha256`, tarPath, `${tarPath}.sha256`]) {
    try {
      fs.unlinkSync(p);
    } catch {
      // ignore
    }
  }

  if (hasCommand("zip")) {
    execFileSync("zip", ["-qr", zipPath, baseName], {
      cwd: path.dirname(outDir),
      stdio: "inherit",
    });
    const digest = sha256File(zipPath);
    fs.writeFileSync(`${zipPath}.sha256`, digest + "\n", "utf8");
    // eslint-disable-next-line no-console
    console.log(`Packaged: ${zipPath} (sha256 in ${zipPath}.sha256)`);
    return;
  }

  if (hasCommand("tar")) {
    execFileSync("tar", ["-czf", tarPath, baseName], {
      cwd: path.dirname(outDir),
      stdio: "inherit",
    });
    const digest = sha256File(tarPath);
    fs.writeFileSync(`${tarPath}.sha256`, digest + "\n", "utf8");
    // eslint-disable-next-line no-console
    console.log(`Packaged: ${tarPath} (sha256 in ${tarPath}.sha256)`);
    return;
  }

  throw new Error("Neither 'zip' nor 'tar' is available to package the data room.");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("❌ Packaging failed\n" + (err?.stack ?? String(err)));
  process.exitCode = 1;
});
