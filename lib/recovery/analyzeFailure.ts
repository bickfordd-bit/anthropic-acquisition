export type FailureReason =
  | "BUILD_ERROR"
  | "CANON_CONFLICT"
  | "DEPLOY_CONFIG"
  | "DEPLOY_RUNTIME"
  | "GIT_ERROR"
  | "AUTHZ_DENY"
  | "UNKNOWN";

export function analyzeFailure(error: unknown): FailureReason {
  const message = String((error as any)?.message ?? error ?? "").toLowerCase();
  const name = String((error as any)?.name ?? "").toLowerCase();

  if (message.includes("forbidden") || message.includes("unauthorized") || message.includes("403")) {
    return "AUTHZ_DENY";
  }

  if (message.includes("canon") || message.includes("non-interference") || message.includes("arbitrat")) {
    return "CANON_CONFLICT";
  }

  if (message.includes("build") || message.includes("typecheck") || message.includes("webpack")) {
    return "BUILD_ERROR";
  }

  if (message.includes("netlify") || message.includes("vercel") || message.includes("railway")) {
    return "DEPLOY_CONFIG";
  }

  if (message.includes("deploy") || message.includes("runtime") || message.includes("crash")) {
    return "DEPLOY_RUNTIME";
  }

  if (message.includes("git") || name.includes("git")) {
    return "GIT_ERROR";
  }

  return "UNKNOWN";
}
