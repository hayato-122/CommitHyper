import { evaluateCommit, combineWithAi, SCORE } from "@/lib/evaluateCommit";
import { aiEvaluateCommit, getLastSkipReason } from "@/lib/aiEvaluate";
import { ImproveMessageSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = ImproveMessageSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Message is required", details: parsed.error.flatten() }, { status: 400 });
  }

  const improvedMessage = parsed.data.message;

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
    aiAvailable: !!aiResult,
    aiReason: aiResult ? null : getLastSkipReason(),
  });
}
