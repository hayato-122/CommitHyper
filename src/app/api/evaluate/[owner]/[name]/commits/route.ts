import { evaluateCommit, combineWithAi, CommitEvaluationResult } from "@/lib/evaluateCommit";
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

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
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

  const cacheKey = `${owner}/${name}/${branch || "default"}`;

  const isStatusCheck = url.searchParams.get("status") === "true";
  if (isStatusCheck) {
    return Response.json({ cached: !refresh && getCached(cacheKey) !== null });
  }

  if (!refresh) {
    const cached = getCached(cacheKey);
    if (cached) return Response.json(cached);
  }

  const encoder = new TextEncoder();
  let isStreamCancelled = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (isStreamCancelled) return;
        try {
          controller.enqueue(encoder.encode(sseEvent(event, data)));
        } catch {
          isStreamCancelled = true;
        }
      };

      try {
        send("progress", { phase: "fetch", current: 0, total: 0, message: "GitHubからコミットを取得中..." });
        const githubCommits = await fetchAllCommits(owner, name, token, branch, limit);
        send("progress", { phase: "fetch_done", current: githubCommits.length, total: githubCommits.length, message: `${githubCommits.length}件のコミットを取得完了` });

        send("phase", { name: "rule", message: "ルールベース評価中..." });
        const ruleResults: { commit: typeof githubCommits[number]; result: CommitEvaluationResult }[] = [];

        for (let i = 0; i < githubCommits.length; i++) {
          const c = githubCommits[i];
          const ruleResult = evaluateCommit(c.commit.message);
          ruleResults.push({ commit: c, result: ruleResult });
          send("progress", { phase: "rule", current: i + 1, total: githubCommits.length });
        }

        const ruleCommits = ruleResults.map((r) => toEvaluatedCommit(r.commit, r.result));
        const totalInitial = ruleCommits.reduce((s, c) => s + c.score, 0);
        const initialAvg = Math.round(totalInitial / ruleCommits.length);

        send("rule_complete", {
          commits: ruleCommits,
          totalCount: ruleCommits.length,
          initialAvg,
          estimatedAiSeconds: Math.round(ruleCommits.length * 1.5),
        });

        send("phase", { name: "ai", message: "AI評価中..." });
        const startTime = Date.now();
        const aiResults: EvaluatedCommit[] = [];

        for (let i = 0; i < ruleResults.length; i++) {
          if (isStreamCancelled) break;

          const { commit, result: ruleResult } = ruleResults[i];
          const aiResult = ruleResult.score >= 100 ? null : await aiEvaluateCommit(commit.commit.message);
          const combined = combineWithAi(ruleResult, aiResult);

          aiResults.push(toEvaluatedCommit(commit, combined));

          const elapsed = (Date.now() - startTime) / 1000;
          const perItem = elapsed / (i + 1);
          const remaining = Math.round(perItem * (ruleResults.length - i - 1));

          send("ai_progress", {
            current: i + 1,
            total: ruleResults.length,
            currentMessage: commit.commit.message.slice(0, 60),
            score: combined.score,
            estimatedSecondsRemaining: remaining,
          });
        }

        const totalCurrent = aiResults.reduce((s, c) => s + c.score, 0);
        const currentAvg = Math.round(totalCurrent / aiResults.length);

        setCache(cacheKey, aiResults);

        send("ai_complete", {
          commits: aiResults,
          totalCount: aiResults.length,
          initialAvg,
          currentAvg,
        });

        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";

        if (message.includes("404")) {
          send("error", { error: "このリポジトリは存在しないか、非公開です" });
        } else {
          console.error("[evaluate/commits] SSE error:", error);
          send("error", { message: "分析中にエラーが発生しました" });
        }

        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
