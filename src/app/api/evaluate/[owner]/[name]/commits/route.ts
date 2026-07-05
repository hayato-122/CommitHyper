import { evaluateCommit, isMergeMessage, CommitEvaluationResult } from "@/lib/evaluateCommit";
import { fetchAllCommits } from "@/lib/github";
import { logger } from "@/lib/logger";
import { createSSEStream, SSE_RESPONSE_HEADERS } from "@/lib/sse";
import { runSSEPipeline, evaluateWithAi } from "@/lib/ssePipeline";
import { EvaluateCommitsQuerySchema } from "@/lib/validation";

export type EvaluatedCommit = {
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

const cache = new Map<string, { data: EvaluatedCommit[]; expiry: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function getCached(key: string): EvaluatedCommit[] | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: EvaluatedCommit[]) {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL_MS });
  if (cache.size > 100) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

function toEvaluatedCommit(
  c: Awaited<ReturnType<typeof fetchAllCommits>>[number],
  result: CommitEvaluationResult,
): EvaluatedCommit {
  return {
    sha: c.sha,
    message: c.commit.message,
    authorName: c.commit.author?.name ?? "",
    committedAt: (c.commit.author?.date ?? c.commit.committer?.date ?? new Date().toISOString()),
    score: result.score,
    rank: result.rank,
    issues: result.issues,
    suggestions: result.suggestions,
    exampleMessage: result.exampleMessage,
    aspectScores: result.aspectScores,
  };
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
  const query = EvaluateCommitsQuerySchema.parse(Object.fromEntries(url.searchParams));
  const branch = query.branch;
  const refresh = query.refresh;
  const limit = query.limit;
  const isStatusCheck = query.status;

  const cacheKey = `${owner}/${name}/${branch || "default"}`;
  if (isStatusCheck) {
    return Response.json({ cached: !refresh && getCached(cacheKey) !== null });
  }

  if (!refresh) {
    const cached = getCached(cacheKey);
    if (cached) return Response.json(cached);
  }

  const { stream, sse } = createSSEStream();

  (async () => {
    try {
      sse.send("progress", { phase: "fetch", current: 0, total: 0, message: "GitHubからコミットを取得中..." });
      const githubCommits = await fetchAllCommits(owner, name, token, branch, limit);
      sse.send("progress", { phase: "fetch_done", current: githubCommits.length, total: githubCommits.length, message: `${githubCommits.length}件のコミットを取得完了` });

      const evaluableCommits = githubCommits.filter((c) => !isMergeMessage(c.commit.message));
      const skippedCount = githubCommits.length - evaluableCommits.length;
      if (skippedCount > 0) {
        sse.send("merge_skipped", { count: skippedCount, message: `${skippedCount}件のマージコミットをスキップしました` });
      }

      const { items } = await runSSEPipeline(
        evaluableCommits,
        sse.send,
        (commit) => onRuleEval(commit),
        (item, commit) => onAiEval(item, commit, request.signal),
        (item) => item.score,
        { signal: request.signal },
      );

      setCache(cacheKey, items);
      sse.close();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      if (message.includes("404")) {
        sse.error({ error: "このリポジトリは存在しないか、非公開です" });
      } else {
        logger.error("[evaluate/commits] SSE error:", error);
        sse.error({ message: "分析中にエラーが発生しました" });
      }
    }
  })();

  return new Response(stream, { headers: SSE_RESPONSE_HEADERS });
}

async function onRuleEval(commit: import("@/lib/github").GitHubCommit): Promise<EvaluatedCommit> {
  const ruleResult = evaluateCommit(commit.commit.message);
  return toEvaluatedCommit(commit, ruleResult);
}

async function onAiEval(item: EvaluatedCommit, commit: import("@/lib/github").GitHubCommit, signal?: AbortSignal): Promise<EvaluatedCommit> {
  if (isMergeMessage(commit.commit.message) || signal?.aborted) {
    return item;
  }

  const { combined } = await evaluateWithAi(commit.commit.message, { signal });
  return {
    ...item,
    score: combined.score,
    rank: combined.rank,
    issues: combined.issues,
    suggestions: combined.suggestions,
    exampleMessage: combined.exampleMessage,
    aspectScores: combined.aspectScores,
  };
}
