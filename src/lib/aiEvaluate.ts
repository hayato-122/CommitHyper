import { logger } from "@/lib/logger";

export type AiEvaluationResult = {
  score: number;
  summaryScore: number;
  whyScore: number;
  suggestedScope: string;
  issues: string[];
  suggestions: string[];
  exampleMessage: string;
};

export type AiSkippedReason =
  | { reason: "no_key" }
  | { reason: "rate_limited"; retryAfterSeconds: number }
  | { reason: "error"; message: string }
  | { reason: "quota_exceeded" };

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
const GEMINI_API_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const EVALUATION_PROMPT = [
  "あなたはコミットメッセージ評価の専門家です。",
  "与えられたコミットメッセージを以下の軸で採点し、JSONで返してください。",
  "コミットメッセージは日本語を前提とします。",
  "",
  "### 観点3: Summaryの具体性（0〜20点）",
  "変更内容を固有名詞を含めて具体的に伝えているか評価。bodyも確認すること。",
  "✅ 具体例: `style(responsive): ヘッダー・改善ページ・サイドバーのレスポンシブ対応`",
  "   → Summaryに「ヘッダー」「サイドバー」「レスポンシブ」などの固有名詞が含まれているので高得点。",
  "❌ 「変更内容が全く書かれていません」というissueは、summaryが空か1単語のみの場合のみ使うこと。",
  "   固有名詞が含まれているメッセージには使用しない。",
  "",
  "### 観点4: Why・背景の説明（0〜15点）",
  "なぜ変更が必要かが伝わるか評価。bodyが空なら0〜10の範囲に留める。",
  "✅ bodyに変更点が箇条書きで複数列挙されている場合、背景説明があるとみなして高得点。",
  "❌ 「なぜ変更したか不明」というissueは、bodyが完全に空の場合のみ使うこと。",
  "",
  "### scopeの提案",
  "変更内容に最適なscope（auth, ui, api, db, deps, config, ci, docs, test, perf, build, refactor）を提案。現状のscopeが適切なら空文字。",
  "",
  "### exampleMessage",
  "改善後の完全なコミットメッセージを1つ。type(scope): summary 形式。summaryは日本語で書くこと。",
  "既に良いメッセージなら改善点を指摘しつつ、より適切なscopeや改行・表記ゆれなどの具体的改善を提案する。",
  "",
  "### issues / suggestions",
  "問題点と改善提案をそれぞれ最大3つ。",
  "「変更内容が全く書かれていません」のような抽象的なissueではなく、",
  "「改行で項目を整理すると読みやすい」「scopeを ui にするとより正確」のように具体的な指摘を優先する。",
].join("\n");

const BATCH_PROMPT = [
  "あなたはコミットメッセージ評価の専門家です。",
  "以下に複数のコミットメッセージを番号付きで示します。",
  "それぞれを以下の軸で採点し、**JSON配列**で返してください。",
  "配列の各要素は、評価対象と同じ順番に対応します。",
  "コミットメッセージは日本語を前提とします。",
  "",
  "### 観点3: Summaryの具体性（0〜20点）",
  "変更内容を固有名詞を含めて具体的に伝えているか評価。bodyも確認すること。",
  "✅ 具体例: `style(responsive): ヘッダー・改善ページ・サイドバーのレスポンシブ対応`",
  "   → Summaryに「ヘッダー」「サイドバー」「レスポンシブ」などの固有名詞が含まれているので高得点。",
  "❌ 「変更内容が全く書かれていません」というissueは、summaryが空か1単語のみの場合のみ使うこと。",
  "   固有名詞が含まれているメッセージには使用しない。",
  "",
  "### 観点4: Why・背景の説明（0〜15点）",
  "なぜ変更が必要かが伝わるか評価。bodyが空なら0〜10の範囲に留める。",
  "✅ bodyに変更点が箇条書きで複数列挙されている場合、背景説明があるとみなして高得点。",
  "❌ 「なぜ変更したか不明」というissueは、bodyが完全に空の場合のみ使うこと。",
  "",
  "### scopeの提案",
  "変更内容に最適なscopeを提案。現状のscopeが適切なら空文字。",
  "",
  "### issues / suggestions",
  "問題点と改善提案をそれぞれ最大3つ。",
  "「変更内容が全く書かれていません」のような抽象的なissueではなく、",
  "「改行で項目を整理すると読みやすい」「scopeを ui にするとより正確」のように具体的な指摘を優先する。",
  "",
  "### exampleMessage",
  "改善後の完全なコミットメッセージを1つ。type(scope): summary 形式。summaryは日本語で書くこと。",
  "既に良いメッセージなら改善点を指摘しつつ、より適切なscopeや改行・表記ゆれなどの具体的改善を提案する。",
  "",
  "レスポンスは必ず配列形式で: [{summaryScore: 0-20, whyScore: 0-15, suggestedScope: string, issues: string[], suggestions: string[], exampleMessage: string}, ...]",
].join("\n");

// --- Daily request counter ---
let dailyCount = 0;
let dailyResetDate = "";
export const RPD_LIMIT = Number(process.env.AI_RPD_LIMIT) || 500;

function checkDailyReset() {
  const today = new Date().toISOString().slice(0, 10);
  if (dailyResetDate !== today) {
    dailyCount = 0;
    dailyResetDate = today;
  }
}

export function getDailyAiCount(): number {
  checkDailyReset();
  return dailyCount;
}

export function isAiRpdExceeded(): boolean {
  checkDailyReset();
  return dailyCount >= RPD_LIMIT;
}

// --- Skip reason tracking ---
let lastSkipReason: AiSkippedReason | null = null;

export function getLastSkipReason(): AiSkippedReason | null {
  const r = lastSkipReason;
  lastSkipReason = null;
  return r;
}

// --- Batch result cache ---
const batchCache = new Map<string, AiEvaluationResult | null>();

export function clearBatchCache() {
  batchCache.clear();
}

function callGemini(body: unknown, options?: { signal?: AbortSignal }): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    return Promise.reject(new Error("no_key"));
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  if (options?.signal) {
    options.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  return fetch(GEMINI_API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    signal: controller.signal,
    body: JSON.stringify(body),
  }).finally(() => clearTimeout(timeoutId));
}

function parseSingleResult(parsed: Record<string, unknown>, defaultMessage: string): AiEvaluationResult {
  const validSummaryScore = Math.max(0, Math.min(20, typeof parsed.summaryScore === "number" ? parsed.summaryScore : 0));
  const validWhyScore = Math.max(0, Math.min(15, typeof parsed.whyScore === "number" ? parsed.whyScore : 0));
  return {
    score: validSummaryScore + validWhyScore,
    summaryScore: validSummaryScore,
    whyScore: validWhyScore,
    suggestedScope: typeof parsed.suggestedScope === "string" ? parsed.suggestedScope.trim() : "",
    issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 3) : [],
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [],
    exampleMessage: typeof parsed.exampleMessage === "string" ? parsed.exampleMessage : defaultMessage,
  };
}

export async function aiEvaluateCommit(
  message: string,
  options?: { signal?: AbortSignal },
): Promise<AiEvaluationResult | null> {
  if (options?.signal?.aborted) {
    lastSkipReason = { reason: "error", message: "cancelled" };
    return null;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    logger.info("[aiEvaluate] GEMINI_API_KEY not set, skipping AI evaluation");
    lastSkipReason = { reason: "no_key" };
    return null;
  }

  const cached = batchCache.get(message);
  if (cached !== undefined) {
    batchCache.delete(message);
    return cached;
  }

  checkDailyReset();
  if (dailyCount >= RPD_LIMIT) {
    logger.warn("[aiEvaluate] Daily request limit reached, skipping AI evaluation");
    lastSkipReason = { reason: "quota_exceeded" };
    return null;
  }

  dailyCount++;

  try {
    const response = await callGemini({
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
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
      },
    }, options);

    if (response.status === 429) {
      logger.warn("[aiEvaluate] Rate limited (429), skipping AI evaluation");
      lastSkipReason = { reason: "rate_limited", retryAfterSeconds: 60 };
      return null;
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "unknown");
      logger.error(`[aiEvaluate] Gemini API error: ${response.status} ${response.statusText}`, errorBody.slice(0, 500));
      lastSkipReason = { reason: "error", message: `Gemini API error: ${response.status}` };
      return null;
    }

    const data = await response.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      logger.error("[aiEvaluate] Empty response from Gemini API");
      lastSkipReason = { reason: "error", message: "empty_response" };
      return null;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      logger.error("[aiEvaluate] JSON parse error, raw text (first 200):", text.slice(0, 200));
      lastSkipReason = { reason: "error", message: "parse_error" };
      return null;
    }
    return parseSingleResult(parsed, message);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      if (options?.signal?.aborted) {
        lastSkipReason = { reason: "error", message: "cancelled" };
        return null;
      }
      logger.warn("[aiEvaluate] Timeout, skipping AI evaluation");
      lastSkipReason = { reason: "error", message: "timeout" };
      return null;
    }
    logger.error("[aiEvaluate] Evaluation failed:", error instanceof Error ? error.message : "Unknown error");
    lastSkipReason = { reason: "error", message: "evaluation_failed" };
    return null;
  }
}

export async function aiEvaluateBatch(
  messages: string[],
  options?: { signal?: AbortSignal },
): Promise<(AiEvaluationResult | null)[]> {
  if (messages.length === 0) return [];
  if (options?.signal?.aborted) return messages.map(() => null);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    return messages.map(() => null);
  }

  checkDailyReset();
  if (dailyCount >= RPD_LIMIT) {
    logger.warn("[aiEvaluate] Daily request limit reached, skipping batch AI evaluation");
    messages.forEach(msg => batchCache.set(msg, null));
    return messages.map(() => null);
  }

  dailyCount++;

  try {
    const numberedMessages = messages.map((m, i) => `${i + 1}. ${m}`).join("\n");
    const response = await callGemini({
      contents: [
        {
          parts: [
            { text: BATCH_PROMPT },
            { text: `評価対象のコミットメッセージ:\n${numberedMessages}` },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
      },
    }, options);

    if (response.status === 429) {
      messages.forEach(msg => batchCache.set(msg, null));
      return messages.map(() => null);
    }
    if (!response.ok) {
      messages.forEach(msg => batchCache.set(msg, null));
      return messages.map(() => null);
    }

    const data = await response.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      messages.forEach(msg => batchCache.set(msg, null));
      return messages.map(() => null);
    }

    const parsed = JSON.parse(text);
    const results = Array.isArray(parsed) ? parsed : [parsed];

    return messages.map((msg, i) => {
      const item = results[i];
      if (!item || typeof item !== "object") {
        batchCache.set(msg, null);
        return null;
      }
      const parsed = parseSingleResult(item, msg);
      batchCache.set(msg, parsed);
      return parsed;
    });
  } catch (error) {
    messages.forEach(msg => batchCache.set(msg, null));
    if (error instanceof Error && error.name === "AbortError") {
      if (options?.signal?.aborted) return messages.map(() => null);
    }
    return messages.map(() => null);
  }
}
