import { evaluateCommit, combineWithAi, SCORE } from "@/lib/evaluateCommit";
import { aiEvaluateCommit } from "@/lib/aiEvaluate";

export async function POST(request: Request) {
  const body = await request.json();
  const improvedMessage = body.message as string;

  if (!improvedMessage || improvedMessage.trim().length === 0) {
    return Response.json({ error: "Message is required" }, { status: 400 });
  }

  const ruleResult = evaluateCommit(improvedMessage);
  const aiResult = await aiEvaluateCommit(improvedMessage);
  const combined = combineWithAi(ruleResult, aiResult);

  return Response.json({
    score: combined.score,
    rank: combined.rank,
    issues: combined.issues,
    suggestions: combined.suggestions,
    exampleMessage: combined.exampleMessage,
    aspectScores: combined.aspectScores,
    passed: combined.score >= SCORE.GOOD,
  });
}
