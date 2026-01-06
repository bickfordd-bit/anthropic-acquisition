export function isFailure(result: unknown): boolean {
  if (!result || typeof result !== "object") return true;

  const r = result as any;
  return (
    r.status === "FAILURE" ||
    r.status === "ERROR" ||
    r.deployStatus === "ERROR" ||
    r.buildFailed === true ||
    r.success === false
  );
}
