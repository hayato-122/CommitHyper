import { logger } from "@/lib/logger";

/**
 * GitHub API 共通クライアント
 * 認証済みルート（session.accessToken）と未認証ルート（GITHUB_TOKEN）の両方から使われる
 */

export type GitHubCommit = {
  sha: string;
  commit: {
    message: string;
    author: { name?: string; email?: string; date?: string };
    committer: { date?: string };
  };
  html_url?: string;
};

export type GitHubBranch = {
  name: string;
};

/**
 * 全コミットをページネーションで取得
 */
export async function fetchAllCommits(
  owner: string,
  name: string,
  token: string,
  branch?: string,
  limit?: number,
): Promise<GitHubCommit[]> {
  const all: GitHubCommit[] = [];
  let page = 1;
  const maxPages = limit ? Math.ceil(limit / 100) : Infinity;

  while (all.length < (limit ?? Infinity)) {
    const base = `https://api.github.com/repos/${owner}/${name}/commits`;
    const params = new URLSearchParams({ per_page: "100", page: String(page) });
    if (branch && branch !== "default") params.set("sha", branch);

    const res = await fetch(`${base}?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!res.ok) {
      logger.error(
        `[github] fetchAllCommits error: ${res.status}`,
        await res.text().catch(() => ""),
      );
      throw new Error(`GitHub API error: ${res.status}`);
    }

    const commits: GitHubCommit[] = await res.json();
    if (commits.length === 0) break;

    all.push(...commits);
    page++;
    if (commits.length < 100 || page > maxPages) break;
  }

  return limit ? all.slice(0, limit) : all;
}

/**
 * 1コミットのdiffを取得
 */
export async function fetchCommitDiff(
  owner: string,
  name: string,
  sha: string,
  token: string,
): Promise<string> {
  const url = `https://api.github.com/repos/${owner}/${name}/commits/${sha}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3.diff",
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`);
  }

  return res.text();
}

export async function fetchSingleCommit(
  owner: string,
  name: string,
  sha: string,
  token: string,
): Promise<GitHubCommit & { parents: { sha: string }[] }> {
  const url = `https://api.github.com/repos/${owner}/${name}/commits/${sha}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
  return res.json();
}

/**
 * ブランチ一覧を取得
 */
export async function fetchBranches(
  owner: string,
  name: string,
  token: string,
): Promise<string[]> {
  const url = `https://api.github.com/repos/${owner}/${name}/branches?per_page=100`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`);
  }

  const branches: GitHubBranch[] = await res.json();
  return branches.map((b) => b.name);
}
