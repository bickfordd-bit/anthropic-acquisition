import { appendLedgerEvent } from "@/lib/ledger/write";

type GitHubPlanCommitArgs = {
  plan: any;
  executionId: string;
};

type RepoSpec = {
  owner: string;
  repo: string;
  baseBranch: string;
};

function parseRepoSpec(): RepoSpec {
  const full = (process.env.BICKFORD_GITHUB_REPO ?? process.env.GITHUB_REPO ?? "").trim();
  const baseBranch = (process.env.BICKFORD_GITHUB_BASE_BRANCH ?? "main").trim() || "main";

  if (!full.includes("/")) {
    throw new Error("Missing BICKFORD_GITHUB_REPO (expected 'owner/repo')");
  }

  const [owner, repo] = full.split("/") as [string, string];
  return { owner, repo, baseBranch };
}

function ghHeaders(): HeadersInit {
  const token = (process.env.GITHUB_TOKEN ?? "").trim();
  if (!token) throw new Error("Missing GITHUB_TOKEN");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

function safePlanFiles(plan: any): Array<{ path: string; content: string }> {
  const files = Array.isArray(plan?.files) ? plan.files : [];
  return files.map((f: any) => ({ path: String(f?.path ?? ""), content: String(f?.content ?? "") }));
}

function assertSafeRepoPath(filePath: string) {
  const p = String(filePath ?? "");
  if (!p) throw new Error("Invalid plan file path");
  if (p.startsWith("/") || p.includes("\\")) throw new Error(`Refusing unsafe path: ${p}`);
  if (p.includes("..")) throw new Error(`Refusing path traversal: ${p}`);
  if (p.startsWith(".git/") || p === ".git" || p.includes("/\.git")) throw new Error("Refusing to touch .git");
}

async function getRefSha(spec: RepoSpec, ref: string): Promise<string> {
  const url = `https://api.github.com/repos/${spec.owner}/${spec.repo}/git/ref/${encodeURIComponent(ref)}`;
  const res = await fetch(url, { headers: ghHeaders() });
  if (!res.ok) throw new Error(`GitHub getRef failed: ${res.status}`);
  const json = (await res.json()) as any;
  const sha = json?.object?.sha;
  if (!sha) throw new Error("GitHub getRef returned no sha");
  return String(sha);
}

async function createBranchIfMissing(spec: RepoSpec, branch: string, baseSha: string): Promise<void> {
  const ref = `heads/${branch}`;
  const url = `https://api.github.com/repos/${spec.owner}/${spec.repo}/git/ref/${encodeURIComponent(ref)}`;
  const existing = await fetch(url, { headers: ghHeaders() });
  if (existing.ok) return;

  const createUrl = `https://api.github.com/repos/${spec.owner}/${spec.repo}/git/refs`;
  const res = await fetch(createUrl, {
    method: "POST",
    headers: ghHeaders(),
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`GitHub create branch failed: ${res.status} ${msg}`);
  }
}

async function getContentSha(spec: RepoSpec, path: string, branch: string): Promise<string | null> {
  const url = `https://api.github.com/repos/${spec.owner}/${spec.repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(
    branch,
  )}`;
  const res = await fetch(url, { headers: ghHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub get contents failed (${path}): ${res.status}`);
  const json = (await res.json()) as any;
  return json?.sha ? String(json.sha) : null;
}

async function putFile(spec: RepoSpec, path: string, content: string, branch: string, message: string): Promise<void> {
  const sha = await getContentSha(spec, path, branch);
  const url = `https://api.github.com/repos/${spec.owner}/${spec.repo}/contents/${encodeURIComponent(path)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: ghHeaders(),
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf8").toString("base64"),
      branch,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`GitHub write failed (${path}): ${res.status} ${msg}`);
  }
}

async function createPullRequest(spec: RepoSpec, branch: string, title: string, body: string): Promise<string> {
  const url = `https://api.github.com/repos/${spec.owner}/${spec.repo}/pulls`;
  const res = await fetch(url, {
    method: "POST",
    headers: ghHeaders(),
    body: JSON.stringify({
      title,
      head: branch,
      base: spec.baseBranch,
      body,
    }),
  });

  if (res.status === 422) {
    const list = await fetch(
      `https://api.github.com/repos/${spec.owner}/${spec.repo}/pulls?state=open&head=${encodeURIComponent(
        `${spec.owner}:${branch}`,
      )}`,
      { headers: ghHeaders() },
    );
    if (list.ok) {
      const arr = (await list.json()) as any[];
      if (arr?.[0]?.html_url) return String(arr[0].html_url);
    }
  }

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`GitHub create PR failed: ${res.status} ${msg}`);
  }

  const json = (await res.json()) as any;
  if (!json?.html_url) throw new Error("GitHub create PR returned no URL");
  return String(json.html_url);
}

export async function commitPlanToGitHubPullRequest({ plan, executionId }: GitHubPlanCommitArgs) {
  const spec = parseRepoSpec();
  const files = safePlanFiles(plan);
  const branch = `bickford/${executionId}`;
  const title = String(plan?.summary ?? "Bickford change").slice(0, 200);
  const message = `Bickford: ${title}`;

  for (const f of files) assertSafeRepoPath(f.path);

  appendLedgerEvent({
    id: crypto.randomUUID(),
    executionId,
    type: "PLAN_GENERATED",
    summary: "Persisting plan to GitHub PR",
    details: { branch, fileCount: files.length },
    timestamp: new Date().toISOString(),
  });

  const baseSha = await getRefSha(spec, `heads/${spec.baseBranch}`);
  await createBranchIfMissing(spec, branch, baseSha);

  for (const f of files) {
    await putFile(spec, f.path, f.content, branch, message);
  }

  const body = `ExecutionId: ${executionId}\n\nFiles:\n${files.map((f) => `- ${f.path}`).join("\n")}`;
  const prUrl = await createPullRequest(spec, branch, title, body);
  return { prUrl, branch };
}
