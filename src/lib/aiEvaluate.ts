/**
 * AIによるコミットメッセージ評価サービス
 * Gemini Flash API を利用して、観点3（具体性）と観点4（Why）を評価する
 * このスコアはルールベース評価（観点1,2,5,6=65点満点）と統合される
 */

export type AiEvaluationResult = {
  /** 観点3 + 観点4 の合計点（0〜35点） */
  score: number;
  /** 観点3: Summaryの具体性（0〜20点） */
  summaryScore: number;
  /** 観点4: Why・背景の説明（0〜15点） */
  whyScore: number;
  /** AIが提案する最適なscope（空文字なら現状維持） */
  suggestedScope: string;
  issues: string[];
  suggestions: string[];
  exampleMessage: string;
};

const GEMINI_API_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent";

const EVALUATION_PROMPT = [
  "あなたはコミットメッセージ評価の専門家です。",
  "与えられたコミットメッセージを以下の3つの軸で採点し、JSON形式で返してください。",
  "",
  "## 評価軸",
  "",
  "### 観点3: Summaryの具体性（20点）",
  "コミットメッセージの1行目（summary）が「何を変更したか」を具体的に伝えているか評価してください。",
  "",
  "- **20点**: 変更した機能名・画面名・ファイル名・ライブラリ名など固有名詞を含み、何を変えたか明確に伝わる",
  "- **10点**: 大まかに何をしたかは伝わるが、固有名詞が足りずやや曖昧",
  "- **3点**: 変更内容が曖昧で、何を変えたか具体的にわからない",
  "- **0点**: 変更内容が全く書かれていない、または1単語だけ",
  "",
  "### 観点4: Why・背景の説明（15点）",
  "「なぜこの変更が必要か」が伝わるか評価してください。**コミットのbody（2行目以降の文章）** も確認すること。",
  "",
  "- **15点**: bodyに変更理由や背景が明確に説明されている（15文字以上）",
  "- **10点**: summaryに理由が含まれている、または変更が自明（初期化・セットアップ・typo修正など）",
  "- **3点**: 変更内容が具体的で最低限の意図は推測できる",
  "- **0点**: Whyが全く伝わらない",
  "",
  "### 観点X: scopeの妥当性と提案（加点対象外・参考情報）",
  "コミットメッセージのscopeが変更内容と一致しているか評価してください。",
  "scopeの意味（auth=認証, ui=画面, api=バックエンド, db=データベース, deps=依存関係, config=設定, ci=CI/CD, docs=ドキュメント, test=テスト, perf=パフォーマンス, refactor=リファクタリング, build=ビルド）を考慮し、",
  "summaryやbodyから読み取れる実際の変更内容と照らし合わせてください。",
  "",
  "- scopeが存在し、変更内容と完全に一致 → suggestedScopeは空文字 \"\"",
  "- scopeが存在しない → suggestedScopeに最適なscopeを1つ提案",
  "- scopeが変更内容と不一致（例: `feat(auth): fix login button` なら scopeはauthではなくuiが適切）→ suggestedScopeにより適切なscopeを提案",
  "",
  "## 採点基準",
  "- 厳しすぎず、Conventional Commits のベストプラクティスに従う",
  "- summaryだけで判断せず、body（空行以降）も読むこと",
  "- bodyが空の場合はwhyScoreは0〜10の範囲に留める",
  "- 初期化・セットアップ・typo修正・軽微なスタイル変更は「Whyが自明」として10点を許容する",
  "- suggestedScopeは英単語1つ（auth, ui, api, db, deps, config, ci, docs, test, perf, build, refactor のいずれか）",
  "",
  "## 応答JSON形式（日本語で出力）",
  "{",
  '  "summaryScore": 数値（0〜20）,',
  '  "whyScore": 数値（0〜15）,',
  '  "suggestedScope": "最適なscope または 空文字",',
  '  "issues": ["問題点1", "問題点2", ...],',
  '  "suggestions": ["改善提案1", "改善提案2", ...],',
  '  "exampleMessage": "改善後のコミットメッセージ例（suggestedScopeを反映）"',
  "}",
  "",
  "- issues は最大3つ、suggestions は最大3つに収める",
  "- exampleMessage は元のメッセージの意図を尊重しつつ、より良い形に改善したものを提示する",
  "- issues が空なら空配列 [] を返す",
  "- scopeが不要な場合は suggestedScope は空文字 \"\" を返す",
].join("\n");

/**
 * コミットメッセージの観点3（具体性）・観点4（Why）をAI（Gemini Flash）で評価する
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

    const jsonStr = extractJson(text);
    if (!jsonStr) {
      console.error(
        "[aiEvaluate] No JSON found in Gemini response:",
        text.slice(0, 300),
      );
      return null;
    }

    const parsed = JSON.parse(jsonStr);

    // バリデーション
    const validSummaryScore = Math.max(0, Math.min(
      20,
      typeof parsed.summaryScore === "number" ? parsed.summaryScore : 0,
    ));
    const validWhyScore = Math.max(0, Math.min(
      15,
      typeof parsed.whyScore === "number" ? parsed.whyScore : 0,
    ));

    const suggestedScope = typeof parsed.suggestedScope === "string"
      ? parsed.suggestedScope.trim()
      : "";

    return {
      score: validSummaryScore + validWhyScore,
      summaryScore: validSummaryScore,
      whyScore: validWhyScore,
      suggestedScope,
      issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 3) : [],
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.slice(0, 3)
        : [],
      exampleMessage: typeof parsed.exampleMessage === "string"
        ? parsed.exampleMessage
        : message,
    };
  } catch (error) {
    console.error("[aiEvaluate] Failed to evaluate commit:", error);
    return null;
  }
}

function extractJson(text: string): string | null {
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return null;
}
