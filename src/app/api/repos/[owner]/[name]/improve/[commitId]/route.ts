import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { evaluateCommit } from "@/lib/evaluateCommit";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; name: string; commitId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { commitId } = await params;

  const evaluation = await prisma.commitEvaluation.findFirst({
    where: { commitId },
    orderBy: { evaluatedAt: "desc" },
  });

  if (!evaluation) {
    return Response.json({ error: "Evaluation not found" }, { status: 404 });
  }

  return Response.json({
    score: evaluation.score,
    rank: evaluation.rank,
    issues: JSON.parse(evaluation.issues),
    suggestions: JSON.parse(evaluation.suggestions),
    exampleMessage: evaluation.exampleMessage,
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

  const evalResult = evaluateCommit(improvedMessage);

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

  let xpGained = 0;
  if (evalResult.score > commit.currentScore) {
    await prisma.commit.update({
      where: { id: commit.id },
      data: { currentScore: evalResult.score },
    });
  }

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

    await prisma.improvementAttempt.update({
      where: { id: attempt.id },
      data: { xpGained },
    });
  }

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
    await prisma.improvementAttempt.update({
      where: { id: attempt.id },
      data: { xpGained },
    });
  }

  return Response.json({
    score: evalResult.score,
    rank: evalResult.rank,
    issues: evalResult.issues,
    suggestions: evalResult.suggestions,
    exampleMessage: evalResult.exampleMessage,
    passed: evalResult.score >= 70,
    xpGained,
  });
}
