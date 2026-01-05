export function violatesNonInterference(params: {
  actor: string;
  action: string;
  ttvImpact: Record<string, number>;
}) {
  for (const [agent, delta] of Object.entries(params.ttvImpact)) {
    if (agent !== params.actor && delta > 0) {
      return {
        violated: true as const,
        agent,
        delta,
      };
    }
  }

  return { violated: false as const };
}
