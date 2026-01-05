export function gateIntent(engine: string, text: string) {
  if (engine === "github-copilot" && /policy|legal/i.test(text)) {
    throw new Error("Copilot cannot reason about policy");
  }

  if (/override|bypass|ignore\s+canon/i.test(text)) {
    throw new Error("Invariant violation");
  }
}
