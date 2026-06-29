import { evaluateCommit, combineWithAi, SCORE } from "@/lib/evaluateCommit";
import { aiEvaluateCommit } from "@/lib/aiEvaluate";
import { fetchAllCommits } from "@/lib/github";

type EvaluatedCommit = {
  sha: string;
  message: string;
  authorName: string;
  committedAt: string;
  score: number;
  rank: string;
  issues: string[];
  suggestions: string[];
  exampleMessage: string;
  aspectScores: Record<string, number>;
};

// 簡易メモリキャッシュ（TTL: 30分）
const cache = new Map<string, { data: EvaluatedCommit[]; expiry: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000;

function getCached(key: string): EvaluatedCommit[] | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: EvaluatedCommit[]) {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
  // メモリリーク防止: 100件を超えたら古い順に削除
  if (cache.size > 100) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; name: string }> },
) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return Response.json(
      { error: "Server misconfigured: GITHUB_TOKEN not set" },
      { status: 500 },
    );
  }

  const { owner, name } = await params;
  const url = new URL(request.url);
  const branch = url.searchParams.get("branch") || undefined;
  const refresh = url.searchParams.get("refresh") === "true";
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 200;

  // キャッシュキー
  const cacheKey = `${owner}/${name}/${branch || "default"}`;

  // キャッシュがあれば（かつrefreshでなければ）返す
  if (!refresh) {
    const cached = getCached(cacheKey);
    if (cached) return Response.json(cached);
  }

  try {
    const githubCommits = await fetchAllCommits(owner, name, token, branch, limit);
    const results: EvaluatedCommit[] = [];

    for (const c of githubCommits) {
      const ruleResult = evaluateCommit(c.commit.message);
      // ルールで100点ならAI評価不要
      const aiResult = ruleResult.score >= 100
        ? null
        : await aiEvaluateCommit(c.commit.message);
      const combined = combineWithAi(ruleResult, aiResult);

      results.push({
        sha: c.sha,
        message: c.commit.message,
        authorName: c.commit.author?.name ?? "",
        committedAt: (c.commit.author?.date ?? c.commit.committer?.date ?? new Date().toISOString()),
        score: combined.score,
        rank: combined.rank,
        issues: combined.issues,
        suggestions: combined.suggestions,
        exampleMessage: combined.exampleMessage,
        aspectScores: combined.aspectScores,
      });
    }

    // キャッシュに保存
    setCache(cacheKey, results);

    return Response.json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("404") ? 404 : 500;

    if (status === 404) {
      return Response.json(
        { error: "このリポジトリは存在しないか、非公開です" },
        { status: 404 },
      );
    }

    console.error("[evaluate/commits]", error);
    return Response.json({ error: message }, { status: 500 });
  }
}
