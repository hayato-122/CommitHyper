/**
 * AIによるコミットメッセージ評価サービス
 * Gemini Flash API を利用して、ルールベースより深い評価と改善提案を生成する
 */

export type AiEvaluationResult = {
  score: number;
  rank: "excellent" | "good" | "needs_improvement" | "poor";
  issues: string[];
  suggestions: string[];
  exampleMessage: string;
};

const GEMINI_API_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent";

const EVALUATION_PROMPT = `あなたはコミットメッセージ評価の専門家です。
与えられたコミットメッセージを以下の6つの軸で採点し、JSON形式で返してください。

## 評価軸
1. **形式の明確さ（20点）**: Conventional Commits 形式 (type(scope): summary) に従っているか
2. **変更種別の適切さ（15点）**: feat / fix / chore / refactor / docs / test / style / build / ci / perf のどれかが適切に選ばれているか
3. **Summaryの具体性（25点）**: 何を変更したか具体的な機能名・処理名が含まれているか
4. **Why・背景の説明（20点）**: なぜ変更したかが伝わるか（本文bodyがあれば加点）
5. **読みやすさ（10点）**: 1行72文字以内に収まっているか
6. **業務での追跡しやすさ（10点）**: 課題番号やスコープが含まれているか

## 採点基準
- 90点以上: excellent
- 70-89点: good
- 50-69点: needs_improvement
- 49点以下: poor

## 応答JSON形式（日本語で出力）
{
  "score": 数値,
  "rank": "excellent" | "good" | "needs_improvement" | "poor",
  "issues": ["問題点1", "問題点2", ...],
  "suggestions": ["改善提案1", "改善提案2", ...],
  "exampleMessage": "改善後のコミットメッセージ例"
}

採点基準は厳しすぎず、Conventional Commits のベストプラクティスに従ってください。
exampleMessage は元のメッセージの意図を尊重しつつ、より良い形に改善したものを提示してください。
issues は最大3つ、suggestions は最大3つに収めてください。`;

/**
 * コミットメッセージをAI（Gemini Flash）で評価する
 * GEMINI_API_KEY が設定されていない場合は null を返す
 */
export async function aiEvaluateCommit(
  message: string,
): Promise<AiEvaluationResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    console.log("[aiEvaluate] GEMINI_API_KEY not set, skipping AI evaluation");
    return null;
  }

  try {
    const response = await fetch(`${GEMINI_API_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: EVALUATION_PROMPT },
              {
                text: `評価対象のコミットメッセージ:\n\`\`\`\n${message}\n\`\`\``,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "unknown");
      console.error(
        `[aiEvaluate] Gemini API error: ${response.status} ${response.statusText}`,
        errorBody.slice(0, 500),
      );
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("[aiEvaluate] Empty response from Gemini API");
      return null;
    }

    // JSON を抽出（コードブロックで囲まれている場合もある）
    const jsonStr = extractJson(text);
    if (!jsonStr) {
      console.error(
        "[aiEvaluate] No JSON found in Gemini response:",
        text.slice(0, 300),
      );
      return null;
    }

    const result: AiEvaluationResult = JSON.parse(jsonStr);

    // バリデーション
    if (
      typeof result.score !== "number" ||
      result.score < 0 ||
      result.score > 100
    ) {
      throw new Error(`Invalid score: ${result.score}`);
    }

    return {
      score: result.score,
      rank: validateRank(result.rank),
      issues: Array.isArray(result.issues) ? result.issues.slice(0, 3) : [],
      suggestions: Array.isArray(result.suggestions)
        ? result.suggestions.slice(0, 3)
        : [],
      exampleMessage: result.exampleMessage || message,
    };
  } catch (error) {
    console.error("[aiEvaluate] Failed to evaluate commit:", error);
    return null;
  }
}

/**
 * レスポンステキストからJSON部分を抽出する
 * コードブロック ```json ... ``` や生JSONに対応
 */
function extractJson(text: string): string | null {
  // コードブロック形式 ```json ... ``` を試す
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // 生JSON形式を試す（最初の { から最後の } まで）
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return null;
}

/**
 * rank の値をバリデーションする
 */
function validateRank(
  rank: string,
): "excellent" | "good" | "needs_improvement" | "poor" {
  const validRanks = [
    "excellent",
    "good",
    "needs_improvement",
    "poor",
  ] as const;
  if (validRanks.includes(rank as (typeof validRanks)[number])) {
    return rank as "excellent" | "good" | "needs_improvement" | "poor";
  }
  // スコアから自動判定
  return "needs_improvement";
}
