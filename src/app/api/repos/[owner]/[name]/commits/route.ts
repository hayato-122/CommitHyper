import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { evaluateCommit, isMergeMessage, SCORE } from "@/lib/evaluateCommit";
import { safeParseJson } from "@/lib/json";
import { logger } from "@/lib/logger";
import { createSSEStream, SSE_RESPONSE_HEADERS } from "@/lib/sse";
import { runSSEPipeline, evaluateWithAi } from "@/lib/ssePipeline";
import { fetchAllCommits } from "@/lib/github";

export type SerializedCommit = {
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

  const isStatusCheck = url.searchParams.get("status") === "true";
  if (isStatusCheck) {
    return Response.json({
      analyzed: !!repository.analyzedAt,
      commitCount: await prisma.commit.count({
        where: { repositoryId: repository.id },
      }),
    });
  }

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
          ? safeParseJson<string>(c.evaluations[0].issues)[0] ?? null
          : null,
        exampleMessage: c.evaluations?.[0]?.exampleMessage ?? null,
        aspectScores: c.evaluations?.[0]?.aspectScores ?? null,
      })),
    );
  }

  if (refresh) {
    await prisma.commitEvaluation.deleteMany({
      where: { commit: { repositoryId: repository.id } },
    });
    await prisma.commit.deleteMany({
      where: { repositoryId: repository.id },
    });
  }

  const { stream, sse } = createSSEStream();

  (async () => {
    try {
      sse.send("progress", { phase: "fetch", current: 0, total: 0, message: "GitHubからコミットを取得中..." });
      const githubCommits = await fetchAllCommits(owner, name, session.accessToken!, branch);
      sse.send("progress", { phase: "fetch_done", current: githubCommits.length, total: githubCommits.length, message: `${githubCommits.length}件のコミットを取得完了` });

      await runSSEPipeline(
        githubCommits,
        sse.send,
        (commit, i, total) => onRuleEval(commit, i, total, repository.id),
        (item) => onAiEval(item),
        (item) => item.currentScore,
      );

      await prisma.repository.update({
        where: { id: repository.id },
        data: { analyzedAt: new Date() },
      });

      sse.close();
    } catch (error) {
      logger.error("[commits] SSE error:", error);
      sse.error({ message: "分析中にエラーが発生しました" });
    }
  })();

  return new Response(stream, { headers: SSE_RESPONSE_HEADERS });
}

async function onRuleEval(commit: import("@/lib/github").GitHubCommit, _i: number, _total: number, repositoryId: string): Promise<SerializedCommit> {
  const evalResult = evaluateCommit(commit.commit.message);
  const status = isMergeMessage(commit.commit.message) ? "auto" :
    evalResult.score >= SCORE.GOOD ? "excellent" : "pending";

  const dbCommit = await prisma.commit.create({
    data: {
      repositoryId,
      sha: commit.sha,
      message: commit.commit.message,
      authorName: commit.commit.author?.name ?? "",
      authorEmail: commit.commit.author?.email ?? "",
      committedAt: new Date(commit.commit.author?.date ?? commit.commit.committer?.date ?? Date.now()),
      url: commit.html_url ?? "",
      initialScore: evalResult.score,
      currentScore: evalResult.score,
      status,
    },
  });

  await prisma.commitEvaluation.create({
    data: {
      commitId: dbCommit.id,
      targetMessage: commit.commit.message,
      score: evalResult.score,
      rank: evalResult.rank,
      issues: JSON.stringify(evalResult.issues),
      suggestions: JSON.stringify(evalResult.suggestions),
      exampleMessage: evalResult.exampleMessage,
      aspectScores: evalResult.aspectScores,
    },
  });

  return {
    id: dbCommit.id,
    sha: dbCommit.sha,
    message: dbCommit.message,
    authorName: dbCommit.authorName,
    committedAt: dbCommit.committedAt.toISOString(),
    initialScore: dbCommit.initialScore,
    currentScore: dbCommit.currentScore,
    status: dbCommit.status,
    firstIssue: evalResult.issues[0] ?? null,
    exampleMessage: evalResult.exampleMessage,
  };
}

async function onAiEval(item: SerializedCommit): Promise<SerializedCommit> {
  if (isMergeMessage(item.message)) {
    return item;
  }

  const { combined } = await evaluateWithAi(item.message);

  await prisma.commit.update({
    where: { id: item.id },
    data: { currentScore: combined.score },
  });

  await prisma.commitEvaluation.create({
    data: {
      commitId: item.id,
      targetMessage: item.message,
      score: combined.score,
      rank: combined.rank,
      issues: JSON.stringify(combined.issues),
      suggestions: JSON.stringify(combined.suggestions),
      exampleMessage: combined.exampleMessage,
      aspectScores: combined.aspectScores,
    },
  });

  return {
    ...item,
    currentScore: combined.score,
    firstIssue: combined.issues[0] ?? null,
    exampleMessage: combined.exampleMessage,
  };
}
