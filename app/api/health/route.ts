export const runtime = "nodejs";

export async function GET() {
  const commit =
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.RAILWAY_GIT_COMMIT_SHA ??
    process.env.GITHUB_SHA ??
    null;

  return Response.json({
    status: "healthy",
    time: new Date().toISOString(),
    commit,
  });
}
