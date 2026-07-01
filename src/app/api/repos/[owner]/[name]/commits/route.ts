import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { evaluateCommit, combineWithAi, SCORE } from "@/lib/evaluateCommit";
import { aiEvaluateCommit } from "@/lib/aiEvaluate";

type GitHubCommit = {
  sha: string;
  commit: {
    message: string;
    author: { name?: string; email?: string; date?: string };
    committer: { date?: string };
  };
  html_url?: string;
};

type SerializedCommit = {
  id: string;
  sha: string;
  message: string;
  authorName: string | null;
  committedAt: string;
  initialScore: number;
  currentScore: number;
  status: string;
  firstIssue?: string | null;
  exampleMessage?: string | null;
};

// GitHub API の全コミットをページネーションで取得
async function fetchAllCommits(
  owner: string,
  name: string,
  token: string,
  branch?: string,
): Promise<GitHubCommit[]> {
  const all: GitHubCommit[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
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
      console.error(`[commits] GitHub API error: ${res.status}`, await res.text().catch(() => ""));
      throw new Error(`GitHub API error: ${res.status}`);
    }

    const commits: GitHubCommit[] = await res.json();
    if (commits.length === 0) break;

    all.push(...commits);
    page++;
    // GitHub returns less than per_page when last page
    if (commits.length < 100) hasMore = false;
  }

  return all;
}

function toSerializedCommit(c: {
  id: string; sha: string; message: string; authorName: string;
  committedAt: Date; initialScore: number; currentScore: number;
  status: string; firstIssue?: string | null; exampleMessage?: string | null;
}): SerializedCommit {
  return {
    id: c.id, sha: c.sha, message: c.message, authorName: c.authorName,
    committedAt: c.committedAt.toISOString(),
    initialScore: c.initialScore, currentScore: c.currentScore, status: c.status,
    firstIssue: c.firstIssue, exampleMessage: c.exampleMessage,
  };
}

// SSEヘルパー
function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; name: string }> },
) {
  const session = await auth();
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { owner, name } = await params;
  const url = new URL(request.url);
  const refresh = url.searchParams.get("refresh") === "true";
  const branch = url.searchParams.get("branch") || undefined;

  const repository = await prisma.repository.findFirst({
    where: { userId: session.user.id, owner, name },
  });
  if (!repository) {
    return Response.json({ error: "Repository not found" }, { status: 404 });
  }

  // ----- ステータス確認（SSEかJSONかの判断用） -----
  const isStatusCheck = url.searchParams.get("status") === "true";
  if (isStatusCheck) {
    return Response.json({
      analyzed: !!repository.analyzedAt,
      commitCount: await prisma.commit.count({
        where: { repositoryId: repository.id },
      }),
    });
  }

  // ----- キャッシュがあればJSONで即返す（refreshでなければ） -----
  if (!refresh && repository.analyzedAt) {
    const existingCommits = await prisma.commit.findMany({
      where: { repositoryId: repository.id },
      orderBy: { committedAt: "desc" },
      take: 200,
      include: { evaluations: { orderBy: { evaluatedAt: "desc" }, take: 1 } },
    });

    return Response.json(
      existingCommits.map((c) => ({
        id: c.id,
        sha: c.sha,
        message: c.message,
        authorName: c.authorName,
        committedAt: c.committedAt.toISOString(),
        initialScore: c.initialScore,
        currentScore: c.currentScore,
        status: c.status,
        firstIssue: c.evaluations?.[0]?.issues
          ? (JSON.parse(c.evaluations[0].issues as string) as string[])[0] ?? null
          : null,
        exampleMessage: c.evaluations?.[0]?.exampleMessage ?? null,
        aspectScores: c.evaluations?.[0]?.aspectScores ?? null,
      })),
    );
  }

  // ----- refresh or 初回分析 → SSE -----
  if (refresh) {
    await prisma.commitEvaluation.deleteMany({
      where: { commit: { repositoryId: repository.id } },
    });
    await prisma.commit.deleteMany({
      where: { repositoryId: repository.id },
    });
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
        // ===== Phase 1: GitHub全件取得 =====
        send("progress", { phase: "fetch", current: 0, total: 0, message: "GitHubからコミットを取得中..." });
        const githubCommits = await fetchAllCommits(owner, name, session.accessToken!, branch);
        send("progress", { phase: "fetch_done", current: githubCommits.length, total: githubCommits.length, message: `${githubCommits.length}件のコミットを取得完了` });

        // ===== Phase 2: ルール評価 + DB保存 =====
        send("phase", { name: "rule", message: "ルールベース評価中..." });
        const savedCommits: SerializedCommit[] = [];

        for (let i = 0; i < githubCommits.length; i++) {
          const c = githubCommits[i];
          const evalResult = evaluateCommit(c.commit.message);
          const status = evalResult.score >= SCORE.GOOD ? "excellent" : "pending";

          const commit = await prisma.commit.create({
            data: {
              repositoryId: repository.id,
              sha: c.sha,
              message: c.commit.message,
              authorName: c.commit.author?.name ?? "",
              authorEmail: c.commit.author?.email ?? "",
              committedAt: new Date(c.commit.author?.date ?? c.commit.committer?.date ?? Date.now()),
              url: c.html_url ?? "",
              initialScore: evalResult.score,
              currentScore: evalResult.score,
              status,
            },
          });

          await prisma.commitEvaluation.create({
            data: {
              commitId: commit.id,
              targetMessage: c.commit.message,
              score: evalResult.score,
              rank: evalResult.rank,
              issues: JSON.stringify(evalResult.issues),
              suggestions: JSON.stringify(evalResult.suggestions),
              exampleMessage: evalResult.exampleMessage,
              aspectScores: evalResult.aspectScores,
            },
          });

          savedCommits.push({
            id: commit.id,
            sha: commit.sha,
            message: commit.message,
            authorName: commit.authorName,
            committedAt: commit.committedAt.toISOString(),
            initialScore: commit.initialScore,
            currentScore: commit.currentScore,
            status: commit.status,
            firstIssue: evalResult.issues[0] ?? null,
            exampleMessage: evalResult.exampleMessage,
          });

          send("progress", { phase: "rule", current: i + 1, total: githubCommits.length });
        }

        // analyzedAt を更新
        await prisma.repository.update({
          where: { id: repository.id },
          data: { analyzedAt: new Date() },
        });

        // 平均スコア計算
        const totalInitial = savedCommits.reduce((s, c) => s + c.initialScore, 0);
        const initialAvg = Math.round(totalInitial / savedCommits.length);

        // ルール評価完了 → クライアントはこの時点でダッシュボード表示可能
        send("rule_complete", {
          commits: savedCommits,
          totalCount: savedCommits.length,
          initialAvg,
          estimatedAiSeconds: Math.round(githubCommits.length * 1.5),
        });

        // ===== Phase 3: AI評価（1件ずつ） =====
        send("phase", { name: "ai", message: "AI評価中..." });
        const startTime = Date.now();
        const aiUpdatedCommits: SerializedCommit[] = [];

        for (let i = 0; i < savedCommits.length; i++) {
          if (isStreamCancelled) break;

          const sc = savedCommits[i];
          const ruleResult = evaluateCommit(sc.message);
          // ルールで100点ならAI評価不要
          const aiResult = ruleResult.score >= 100
            ? null
            : await aiEvaluateCommit(sc.message);

          if (aiResult) {
            const combined = combineWithAi(ruleResult, aiResult);

            // DB更新
            await prisma.commit.update({
              where: { id: sc.id },
              data: { currentScore: combined.score },
            });

            // Evaluation更新（AIをマージした結果を保存）
            await prisma.commitEvaluation.create({
              data: {
                commitId: sc.id,
                targetMessage: sc.message,
                score: combined.score,
                rank: combined.rank,
                issues: JSON.stringify(combined.issues),
                suggestions: JSON.stringify(combined.suggestions),
                exampleMessage: combined.exampleMessage,
                aspectScores: combined.aspectScores,
              },
            });

            const elapsed = (Date.now() - startTime) / 1000;
            const perItem = elapsed / (i + 1);
            const remaining = Math.round(perItem * (savedCommits.length - i - 1));

            send("ai_progress", {
              current: i + 1,
              total: savedCommits.length,
              currentMessage: sc.message.slice(0, 60),
              score: combined.score,
              estimatedSecondsRemaining: remaining,
            });

            aiUpdatedCommits.push({
              ...sc,
              currentScore: combined.score,
              firstIssue: combined.issues[0] ?? null,
              exampleMessage: combined.exampleMessage,
            });
          } else {
            // AI評価失敗 → ルールスコアのまま
            aiUpdatedCommits.push({ ...sc });
            send("ai_progress", {
              current: i + 1,
              total: savedCommits.length,
              currentMessage: sc.message.slice(0, 60),
            });
          }
        }

        // 最終平均スコア
        const totalCurrent = aiUpdatedCommits.reduce((s, c) => s + c.currentScore, 0);
        const currentAvg = Math.round(totalCurrent / aiUpdatedCommits.length);

        send("ai_complete", {
          commits: aiUpdatedCommits,
          totalCount: aiUpdatedCommits.length,
          initialAvg,
          currentAvg,
        });

        controller.close();
      } catch (error) {
        console.error("[commits] SSE error:", error);
        send("error", { message: "分析中にエラーが発生しました" });
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
