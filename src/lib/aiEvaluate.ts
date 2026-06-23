/**
 * AIによるコミットメッセージ評価サービス
 * Gemini Flash API を利用して、観点3（具体性）と観点4（Why）を評価する
 * このスコアはルールベース評価（観点1,2,5,6=55点満点）と統合される
 */

export type AiEvaluationResult = {
  /** 観点3 + 観点4 の合計点（0〜45点） */
  score: number;
  /** 観点3: Summaryの具体性（0〜25点） */
  summaryScore: number;
  /** 観点4: Why・背景の説明（0〜20点） */
  whyScore: number;
  issues: string[];
  suggestions: string[];
  exampleMessage: string;
};

const GEMINI_API_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent";

const EVALUATION_PROMPT = `あなたはコミットメッセージ評価の専門家です。
与えられたコミットメッセージを以下の2つの軸で採点し、JSON形式で返してください。

## 評価軸

### 観点3: Summaryの具体性（25点）
コミットメッセージの1行目（summary）が「何を変更したか」を具体的に伝えているか評価してください。

- **25点**: 変更した機能名・画面名・処理名など固有名詞を含み、何を変えたか明確に伝わる
  - 例: \`authにGoogleログインを追加する\`、\`ダッシュボードのソート機能を修正する\`
- **15点**: 大まかに何をしたかは伝わるが、固有名詞が足りずやや曖昧
  - 例: \`機能を追加する\`、\`バグを修正する\`
- **5点**: 変更内容が曖昧で、何を変えたか具体的にわからない
  - 例: \`修正\`、\`更新\`、\`色々直した\`
- **0点**: 変更内容が全く書かれていない、または1単語だけ

### 観点4: Why・背景の説明（20点）
「なぜこの変更が必要か」が伝わるか評価してください。**コミットのbody（2行目以降の文章）** も確認して判断すること。

- **20点**: bodyに変更理由や背景が明確に説明されている
  - 例: bodyに \`ログイン失敗時のエラーがユーザーに表示されないため\` など
- **12点**: summaryに理由が含まれている、または変更が自明（初期化・セットアップ・typo修正など）
  - 例: \`プロジェクトを初期化する\`（初期化は理由が自明）
- **0点**: Whyが全く伝わらない

## 採点基準
- 厳しすぎず、Conventional Commits のベストプラクティスに従う
- summaryだけで判断せず、body（空行以降）も読むこと
- 初期化・セットアップ・typo修正・軽微なスタイル変更は「Whyが自明」として12点を許容する

## 応答JSON形式（日本語で出力）
{
  "summaryScore": 数値（0〜25）,
  "whyScore": 数値（0〜20）,
  "issues": ["問題点1", "問題点2", ...],
  "suggestions": ["改善提案1", "改善提案2", ...],
  "exampleMessage": "改善後のコミットメッセージ例"
}

- issues は最大3つ、suggestions は最大3つに収める
- exampleMessage は元のメッセージの意図を尊重しつつ、より良い形に改善したものを提示する
- issues が空なら空配列 [] を返す`;

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
                text: `評価対象のコミットメッセージ:\`\`\`\n${message}\n\`\`\``,
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

    const parsed = JSON.parse(jsonStr);

    // --- バリデーション ---
    const summaryScore = typeof parsed.summaryScore === "number" ? parsed.summaryScore : 0;
    const whyScore = typeof parsed.whyScore === "number" ? parsed.whyScore : 0;

    // スコア範囲をクランプ
    const validSummaryScore = Math.max(0, Math.min(25, summaryScore));
    const validWhyScore = Math.max(0, Math.min(20, whyScore));

    const score = validSummaryScore + validWhyScore;

    return {
      score,
      summaryScore: validSummaryScore,
      whyScore: validWhyScore,
      issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 3) : [],
      suggestions: Array.isArray(parsed.suggestions)
        ? parsed.suggestions.slice(0, 3)
        : [],
      exampleMessage: typeof parsed.exampleMessage === "string" ? parsed.exampleMessage : message,
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
