export function routeIntent(text: string) {
  if (/acquisition|anthropic/i.test(text)) return { branch: "anthropic-acquisition" };
  if (/runtime|ledger|optr/i.test(text)) return { branch: "session-complete-runtime" };
  if (/ui|chatbox|visual/i.test(text)) return { branch: "ui" };
  return { branch: "general" };
}
