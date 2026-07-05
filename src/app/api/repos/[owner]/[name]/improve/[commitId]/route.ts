import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { evaluateCommit, combineWithAi, SCORE } from "@/lib/evaluateCommit";
import { aiEvaluateCommit } from "@/lib/aiEvaluate";
import { safeParseJson } from "@/lib/json";
import { fetchAllCommits } from "@/lib/github";
import { ImproveMessageSchema } from "@/lib/validation";

export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ owner: string; name: string; commitId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { commitId } = await params;

  // DBから最新の評価を取得（初回分析時にルール+AIが保存されている）
  const evaluation = await prisma.commitEvaluation.findFirst({
    where: { commitId },
    orderBy: { evaluatedAt: "desc" },
  });

  if (!evaluation) {
    return Response.json({ error: "Evaluation not found" }, { status: 404 });
  }

  // 既存データにaspectScoresがない場合はルールベースで計算して補完
  let aspectScores = evaluation.aspectScores as Record<string, number> | null;
  if (!aspectScores || Object.values(aspectScores).every((v) => v === 0)) {
    aspectScores = evaluateCommit(evaluation.targetMessage).aspectScores;
  }

  return Response.json({
    score: evaluation.score,
    rank: evaluation.rank,
    issues: safeParseJson<string>(evaluation.issues),
    suggestions: safeParseJson<string>(evaluation.suggestions),
    exampleMessage: evaluation.exampleMessage,
    aspectScores,
  });
}

// POST: 再評価（改善メッセージの評価のみ、DB保存はしない）
export async function POST(
  request: Request,
  {
    params,
  }: { params: Promise<{ owner: string; name: string; commitId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { commitId } = await params;
  const body = await request.json();
  const parsed = ImproveMessageSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Message is required", details: parsed.error.flatten() }, { status: 400 });
  }

  const improvedMessage = parsed.data.message;

  const commit = await prisma.commit.findUnique({
    where: { id: commitId },
  });
  if (!commit) {
    return Response.json({ error: "Commit not found" }, { status: 404 });
  }

  const ruleResult = evaluateCommit(improvedMessage);
  const aiResult = await aiEvaluateCommit(improvedMessage);

  // AI結果があれば統合、なければルール評価をそのまま
  const combined = combineWithAi(ruleResult, aiResult);

  return Response.json({
    score: combined.score,
    rank: combined.rank,
    issues: combined.issues,
    suggestions: combined.suggestions,
    exampleMessage: combined.exampleMessage,
    aspectScores: combined.aspectScores,
    passed: combined.score >= SCORE.GOOD,
    xpGained: 0,
    pendingApply: true,
    aiAvailable: !!aiResult,
  });
}

// PUT: 改善メッセージをDBに反映し、XPを付与する（「修正完了」ボタン用）
export async function PUT(
  request: Request,
  {
    params,
  }: { params: Promise<{ owner: string; name: string; commitId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { owner, name, commitId } = await params;
  const body = await request.json();
  const parsed = ImproveMessageSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Message is required", details: parsed.error.flatten() }, { status: 400 });
  }

  const improvedMessage = parsed.data.message;

  const commit = await prisma.commit.findUnique({
    where: { id: commitId },
  });
  if (!commit) {
    return Response.json({ error: "Commit not found" }, { status: 404 });
  }

  // ブランチの最新コミットから改善メッセージを探索（rebase後もSHA不変）
  const branch = parsed.data.branch;
  let newSha = commit.sha;

  if (branch) {
    try {
      const branchCommits = await fetchAllCommits(owner, name, session.accessToken!, branch, 20);
      const matched = branchCommits.find(
        (c) => c.commit.message.trim() === improvedMessage.trim(),
      );
      if (matched) {
        newSha = matched.sha;
      } else {
        return Response.json({
          error: "改善後のメッセージがGitHub上で見つかりません。正しくプッシュされていません。git push --force-with-lease を実行してから再度お試しください。",
          verified: false,
        }, { status: 400 });
      }
    } catch {
      return Response.json({
        error: "GitHubからのコミット取得に失敗しました。アクセストークンが有効か確認してください。",
        verified: false,
      }, { status: 500 });
    }
  }

  // SHAが変わっていたらDB更新（rebase後など）
  if (newSha !== commit.sha) {
    await prisma.commit.update({
      where: { id: commit.id },
      data: { sha: newSha },
    });
  }

  const ruleResult = evaluateCommit(improvedMessage);
  const aiResult = await aiEvaluateCommit(improvedMessage);
  const combined = combineWithAi(ruleResult, aiResult);

  // ImprovementAttempt を保存
  const attempt = await prisma.improvementAttempt.create({
    data: {
      commitId: commit.id,
      userId: session.user.id,
      beforeMessage: commit.message,
      afterMessage: improvedMessage,
      beforeScore: commit.currentScore,
      afterScore: combined.score,
      passed: combined.score >= SCORE.GOOD,
      xpGained: 0,
    },
  });

  // currentScore 更新（改善していれば）
  if (combined.score > commit.currentScore) {
    await prisma.commit.update({
      where: { id: commit.id },
      data: { currentScore: combined.score },
    });
  }

  let xpGained = 0;

  // 合格（70点以上）→ XP付与 + status更新
  if (combined.score >= SCORE.GOOD) {
    await prisma.commit.update({
      where: { id: commit.id },
      data: { status: "improved" },
    });

    xpGained = combined.score >= SCORE.EXCELLENT ? 15 : 10;

    await prisma.xpEvent.create({
      data: {
        userId: session.user.id,
        type:
          combined.score >= SCORE.EXCELLENT
            ? "improvement_excellent"
            : "improvement_passed",
        amount: xpGained,
        reason: `コミット改善に合格（${combined.score}点）`,
        relatedCommitId: commit.id,
      },
    });

    await prisma.user.update({
      where: { id: session.user.id },
      data: { xp: { increment: xpGained } },
    });
  }

  // 不合格だが50点以上 → 努力XPを微量付与
  if (
    combined.score >= SCORE.NEEDS_IMPROVEMENT &&
    combined.score < SCORE.GOOD
  ) {
    xpGained = 3;
    await prisma.xpEvent.create({
      data: {
        userId: session.user.id,
        type: "retry_bonus",
        amount: xpGained,
        reason: `改善努力（${combined.score}点）`,
        relatedCommitId: commit.id,
      },
    });
    await prisma.user.update({
      where: { id: session.user.id },
      data: { xp: { increment: xpGained } },
    });
  }

  // ImprovementAttempt の XP を更新
  await prisma.improvementAttempt.update({
    where: { id: attempt.id },
    data: { xpGained },
  });

  // 更新後のユーザー情報を取得
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { xp: true, level: true, title: true },
  });

  return Response.json({
    score: combined.score,
    rank: combined.rank,
    passed: combined.score >= SCORE.GOOD,
    xpGained,
    user,
    applied: true,
    verified: true,
  });
}
