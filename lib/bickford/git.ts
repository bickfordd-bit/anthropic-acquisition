import { execSync } from "child_process";

export async function commitAndPush(message: string) {
  if (process.env.BICKFORD_GIT_ENABLED !== "true") {
    throw new Error("BICKFORD_GIT_ENABLED is not true; refusing to run git operations");
  }

  execSync("git add .", { stdio: "inherit" });
  execSync(`git commit -m ${JSON.stringify(message)}`, { stdio: "inherit" });
  execSync("git push", { stdio: "inherit" });

  const sha = execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] })
    .toString()
    .trim();
  return sha;
}
