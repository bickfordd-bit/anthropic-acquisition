// lib/bickford/deploy.ts
export async function deploy() {
  await fetch(process.env.NETLIFY_BUILD_HOOK!);
  return "https://your-site.netlify.app";
}
