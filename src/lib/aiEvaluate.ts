import { logger } from "@/lib/logger";

export type AiEvaluationResult = {
  score: number;
  summaryScore: number;
  whyScore: number;
  suggestedScope: string;
  issues: string[];
  suggestions: string[];
  exampleMessage: string;
  skipped?: null;
};

export type AiSkippedReason =
  | { reason: "no_key" }
  | { reason: "rate_limited"; retryAfterSeconds: number }
  | { reason: "error"; message: string }
  | { reason: "quota_exceeded" };

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_API_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const EVALUATION_PROMPT = [
  "あなたはコミットメッセージ評価の専門家です。",
  "与えられたコミットメッセージを以下の軸で採点し、JSONで返してください。",
  "",
  "### 観点3: Summaryの具体性（0〜20点）",
  "変更内容を固有名詞を含めて具体的に伝えているか評価。bodyも確認すること。",
  "",
  "### 観点4: Why・背景の説明（0〜15点）",
  "なぜ変更が必要かが伝わるか評価。bodyが空なら0〜10の範囲に留める。",
  "",
  "### scopeの提案",
  "変更内容に最適なscope（auth, ui, api, db, deps, config, ci, docs, test, perf, build, refactor）を提案。現状のscopeが適切なら空文字。",
  "",
  "### exampleMessage",
  "改善後の完全なコミットメッセージを1つ。type(scope): summary 形式。",
  "",
  "### issues / suggestions",
  "問題点と改善提案をそれぞれ最大3つ。",
].join("\n");

export async function aiEvaluateCommit(
  message: string,
  options?: { signal?: AbortSignal },
): Promise<AiEvaluationResult | null> {
  if (options?.signal?.aborted) return null;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    logger.info("[aiEvaluate] GEMINI_API_KEY not set, skipping AI evaluation");
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  if (options?.signal) {
    options.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(GEMINI_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: EVALUATION_PROMPT },
              { text: `評価対象のコミットメッセージ:\n\`\`\`\n${message}\n\`\`\`` },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 256,
          responseMimeType: "application/json",
        },
      }),
    });
    clearTimeout(timeoutId);

    if (response.status === 429) {
      logger.warn("[aiEvaluate] Rate limited (429), skipping AI evaluation");
      return null;
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "unknown");
      logger.error(`[aiEvaluate] Gemini API error: ${response.status} ${response.statusText}`, errorBody.slice(0, 500));
      return null;
    }

    const data = await response.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      logger.error("[aiEvaluate] Empty response from Gemini API");
      return null;
    }

    const parsed = JSON.parse(text);

    const validSummaryScore = Math.max(0, Math.min(20, typeof parsed.summaryScore === "number" ? parsed.summaryScore : 0));
    const validWhyScore = Math.max(0, Math.min(15, typeof parsed.whyScore === "number" ? parsed.whyScore : 0));

    return {
      score: validSummaryScore + validWhyScore,
      summaryScore: validSummaryScore,
      whyScore: validWhyScore,
      suggestedScope: typeof parsed.suggestedScope === "string" ? parsed.suggestedScope.trim() : "",
      issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 3) : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [],
      exampleMessage: typeof parsed.exampleMessage === "string" ? parsed.exampleMessage : message,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      if (options?.signal?.aborted) return null;
      logger.warn("[aiEvaluate] Timeout, skipping AI evaluation");
      return null;
    }
    logger.error("[aiEvaluate] Evaluation failed:", error instanceof Error ? error.message : "Unknown error");
    return null;
  }
}
