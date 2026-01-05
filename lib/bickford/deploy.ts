// lib/bickford/deploy.ts
export async function deploy() {
  const buildHook = process.env.NETLIFY_BUILD_HOOK;
  if (!buildHook) {
    throw new Error("NETLIFY_BUILD_HOOK environment variable is not set");
  }
  const response = await fetch(buildHook);
  if (!response.ok) {
    throw new Error(`Deployment trigger failed: ${response.statusText}`);
  }
  // Return the configured base URL or a default
  return process.env.BICKFORD_BASE_URL || "https://your-site.netlify.app";
}
