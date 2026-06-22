import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { evaluateCommit } from "@/lib/evaluateCommit";
import { aiEvaluateCommit } from "@/lib/aiEvaluate";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; name: string; commitId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { commitId } = await params;

  // ルールベース評価をDBから取得（commit取得時に行われたもの）
  const evaluation = await prisma.commitEvaluation.findFirst({
    where: { commitId },
    orderBy: { evaluatedAt: "desc" },
  });

  if (!evaluation) {
    return Response.json({ error: "Evaluation not found" }, { status: 404 });
  }

  // コミットメッセージを取得（AI評価に使う）
  const commit = await prisma.commit.findUnique({
    where: { id: commitId },
  });

  // AI評価（Gemini Flash）をオンデマンド生成
  // GEMINI_API_KEY が設定されていない場合は null になる
  const aiResult = commit ? await aiEvaluateCommit(commit.message) : null;

  return Response.json({
    // ルールベース評価（従来の評価）
    score: evaluation.score,
    rank: evaluation.rank,
    issues: JSON.parse(evaluation.issues as string) as string[],
    suggestions: JSON.parse(evaluation.suggestions as string) as string[],
    exampleMessage: evaluation.exampleMessage,
    // AI評価（Gemini Flash、オプショナル）
    ai: aiResult
      ? {
          score: aiResult.score,
          rank: aiResult.rank,
          issues: aiResult.issues,
          suggestions: aiResult.suggestions,
          exampleMessage: aiResult.exampleMessage,
        }
      : null,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ owner: string; name: string; commitId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { commitId } = await params;
  const body = await request.json();
  const improvedMessage = body.message as string;

  if (!improvedMessage || improvedMessage.trim().length === 0) {
    return Response.json({ error: "Message is required" }, { status: 400 });
  }

  const commit = await prisma.commit.findUnique({
    where: { id: commitId },
  });
  if (!commit) {
    return Response.json({ error: "Commit not found" }, { status: 404 });
  }

  // ★ 評価のみ実行（DBへの書き込みは行わない）
  // 点数・XPの反映は PUT で行う
  const evalResult = evaluateCommit(improvedMessage);
  const aiResult = await aiEvaluateCommit(improvedMessage);

  return Response.json({
    score: evalResult.score,
    rank: evalResult.rank,
    issues: evalResult.issues,
    suggestions: evalResult.suggestions,
    exampleMessage: evalResult.exampleMessage,
    passed: evalResult.score >= 70,
    // XPはまだ付与されていないことを明示
    xpGained: 0,
    pendingApply: true,
    // AI評価（参考情報）
    ai: aiResult
      ? {
          score: aiResult.score,
          rank: aiResult.rank,
          issues: aiResult.issues,
          suggestions: aiResult.suggestions,
          exampleMessage: aiResult.exampleMessage,
        }
      : null,
  });
}

// PUT: 改善メッセージをDBに反映し、XPを付与する（「GitHubに反映」ボタン用）
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ owner: string; name: string; commitId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { commitId } = await params;
  const body = await request.json();
  const improvedMessage = body.message as string;

  if (!improvedMessage || improvedMessage.trim().length === 0) {
    return Response.json({ error: "Message is required" }, { status: 400 });
  }

  const commit = await prisma.commit.findUnique({
    where: { id: commitId },
  });
  if (!commit) {
    return Response.json({ error: "Commit not found" }, { status: 404 });
  }

  // 最終評価を実行
  const evalResult = evaluateCommit(improvedMessage);

  // ImprovementAttempt を保存
  const attempt = await prisma.improvementAttempt.create({
    data: {
      commitId: commit.id,
      userId: session.user.id,
      beforeMessage: commit.message,
      afterMessage: improvedMessage,
      beforeScore: commit.currentScore,
      afterScore: evalResult.score,
      passed: evalResult.score >= 70,
      xpGained: 0,
    },
  });

  // currentScore 更新（改善していれば）
  if (evalResult.score > commit.currentScore) {
    await prisma.commit.update({
      where: { id: commit.id },
      data: { currentScore: evalResult.score },
    });
  }

  let xpGained = 0;

  // 合格（70点以上）→ XP付与 + status更新
  if (evalResult.score >= 70) {
    await prisma.commit.update({
      where: { id: commit.id },
      data: { status: "improved" },
    });

    xpGained = evalResult.score >= 90 ? 15 : 10;

    await prisma.xpEvent.create({
      data: {
        userId: session.user.id,
        type: evalResult.score >= 90 ? "improvement_excellent" : "improvement_passed",
        amount: xpGained,
        reason: `コミット改善に合格（${evalResult.score}点）`,
        relatedCommitId: commit.id,
      },
    });

    await prisma.user.update({
      where: { id: session.user.id },
      data: { xp: { increment: xpGained } },
    });
  }

  // 不合格だが50点以上 → 努力XPを微量付与
  if (evalResult.score >= 50 && evalResult.score < 70) {
    xpGained = 3;
    await prisma.xpEvent.create({
      data: {
        userId: session.user.id,
        type: "retry_bonus",
        amount: xpGained,
        reason: `改善努力（${evalResult.score}点）`,
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
    score: evalResult.score,
    rank: evalResult.rank,
    passed: evalResult.score >= 70,
    xpGained,
    user,
    applied: true,
  });
}
