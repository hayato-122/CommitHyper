export type AspectScores = {
  format: number;        // 観点1: 形式の明確さ 0-20
  type: number;          // 観点2: 変更種別の適切さ 0-15
  summary: number;       // 観点3: Summaryの具体性 0-25（AI評価で上書き）
  why: number;           // 観点4: Why・背景の説明 0-20（AI評価で上書き）
  readability: number;   // 観点5: 読みやすさ 0-10
  traceability: number;  // 観点6: 業務での追跡しやすさ 0-10
};

export type CommitEvaluationResult = {
  score: number;
  rank: "excellent" | "good" | "needs_improvement" | "poor";
  issues: string[];
  suggestions: string[];
  exampleMessage: string;
  /** 観点別スコア（AI統合前に使う内部値） */
  aspectScores: AspectScores;
};

// Conventional Commits の type一覧
const VALID_TYPES = [
  "feat", "fix", "docs", "refactor", "test",
  "style", "chore", "build", "ci", "perf",
];

// type(scope): summary の形式をパースする正規表現
const CONVENTIONAL_REGEX = /^(\w+)(?:\(([^)]+)\))?:\s(.+)/;

// valid type + scopeまであるがコロンがない場合を検出（例: chore(.gitignore) message）
const TYPE_SCOPE_NO_COLON = /^(fix|feat|chore|docs|refactor|test|style|build|ci|perf)\(([^)]+)\)\s(.+)/i;

function getRank(score: number): CommitEvaluationResult["rank"] {
  return score >= 90 ? "excellent" :
    score >= 70 ? "good" :
    score >= 50 ? "needs_improvement" :
    "poor";
}

export function evaluateCommit(message: string): CommitEvaluationResult {
  const issues: string[] = [];
  const suggestions: string[] = [];
  const firstLine = message.split("\n")[0];
  const body = message.split("\n").slice(2).join("\n").trim();

  // 観点別スコア
  const aspectScores: AspectScores = {
    format: 0,
    type: 0,
    summary: 0,
    why: 0,
    readability: 0,
    traceability: 0,
  };

  let score = 0;

  // --- 0. 特別処理: 既知の自動生成メッセージ ---

  // "Initial commit" / "first commit" → 業界標準の最初のコミット
  const isFirstCommit = /^(initial|first)\s+commit/i.test(firstLine);
  if (isFirstCommit) {
    aspectScores.summary = 25;
    aspectScores.why = 20;
    aspectScores.readability = 10;
    aspectScores.traceability = 5;
    return {
      score: 60,
      rank: "needs_improvement",
      aspectScores,
      issues: [
        "Conventional Commits 形式（type(scope): summary）ではありません",
        "scope（変更範囲）や課題番号がありません",
      ],
      suggestions: [
        "`feat(scope): summary` 形式にするとスコアが上がります",
        "例: `feat(project): Next.jsプロジェクトを初期化する`",
      ],
      exampleMessage: "feat(project): Next.jsプロジェクトを初期化する",
    };
  }

  // "Merge pull request ..." → GitHub自動生成のマージコミット
  if (/^merge pull request/i.test(firstLine)) {
    aspectScores.type = 15;
    aspectScores.summary = 25;
    aspectScores.readability = 10;
    aspectScores.traceability = 10;
    return {
      score: 60,
      rank: "needs_improvement",
      aspectScores,
      issues: [
        "自動生成メッセージのため Conventional Commits 形式ではありません",
      ],
      suggestions: [
        "squash merge を使うと `feat(scope): summary` 形式で統一されスコアが上がります",
      ],
      exampleMessage: "feat(dashboard): ソート機能を統合する",
    };
  }

  // --- 1. 形式の明確さ / 20点 ---
  const match = firstLine.match(CONVENTIONAL_REGEX);
  let type = "";
  let scope = "";
  let summary = firstLine;

  if (match) {
    // 完全な Conventional Commits 形式 chore(.gitignore): summary
    type = match[1];
    scope = match[2] || "";
    summary = match[3];
    aspectScores.format = scope ? 20 : 16;
    score += aspectScores.format;
  } else {
    // コロン欠落: valid type + scopeまではある（例: chore(.gitignore) message）
    const partialMatch = firstLine.match(TYPE_SCOPE_NO_COLON);
    if (partialMatch) {
      type = partialMatch[1];
      scope = partialMatch[2] || "";
      summary = partialMatch[3];
      aspectScores.format = 12;
      score += 12;
      issues.push("`type(scope) ` の後にコロン（:）がありません。");
      suggestions.push("`type(scope): summary` の形式でコロンを入れてください。");
    } else if (/^(fix|feat|update|add|remove|change|refactor|fixup|修正)/i.test(firstLine)) {
      // typeのみある
      aspectScores.format = 8;
      score += 8;
      issues.push("コミットメッセージの形式が不完全です。`type(scope): summary` の形式を推奨します。");
      suggestions.push("例: `fix(auth): ログイン時のエラー処理を修正する`");
    } else {
      issues.push("Conventional Commits の形式になっていません。");
      suggestions.push("`type(scope): summary` の形式で書き直してください。");
      if (isJapanese(firstLine)) {
        suggestions.push("英語の type prefix（feat / fix など）を付けてください。");
      }
    }
  }

  // --- 2. 変更種別の適切さ / 15点 ---
  if (type && VALID_TYPES.includes(type)) {
    aspectScores.type = 15;
    score += 15;
  } else if (type) {
    const closeMatch = VALID_TYPES.find((t) => type.startsWith(t) || t.startsWith(type));
    if (closeMatch) {
      aspectScores.type = 8;
      score += 8;
      issues.push(`変更種別 \`${type}\` は \`${closeMatch}\` に近い表記です。統一を推奨します。`);
      suggestions.push(`\`${type}\` ではなく \`${closeMatch}\` を使ってください。`);
    } else {
      issues.push(`変更種別 \`${type}\` は一般的ではありません。`);
      suggestions.push(`feat / fix / refactor / chore など標準的な type を使ってください。`);
    }
  } else {
    // typeがない場合は0点（形式の明確さで既にスコアが低い）
  }

  // --- 3. Summaryの具体性 / 25点 ---
  // ★ ルールベースのスコアを記録（後でAI評価に置き換えられる）
  if (summary.length >= 10 && summary.length <= 100) {
    if (containsSpecificInfo(summary)) {
      aspectScores.summary = 25;
      score += 25;
    } else if (summary.length >= 15) {
      aspectScores.summary = 15;
      score += 15;
      issues.push("変更内容はある程度伝わりますが、固有名詞（機能名・画面名など）を入れるとさらに良くなります。");
      suggestions.push("例: `認証機能を追加する` ではなく `Googleログイン機能を追加する` のように具体的に。");
    } else {
      aspectScores.summary = 5;
      score += 5;
      issues.push("変更内容が曖昧です。何を変更したか具体的に書いてください。");
      suggestions.push("変更した機能・画面・処理の名前を含めてください。");
    }
  } else if (summary.length < 10 && summary.length > 0) {
    if (isJapanese(summary) && summary.length <= 4) {
      score += 0;
      issues.push("変更内容が短すぎて何をしたか分かりません。");
      suggestions.push("具体的な変更内容を書いてください。例: `ログインエラーの表示を修正する`");
    } else {
      const words = summary.split(/\s+/);
      if (words.length === 1 && words[0].length < 6) {
        score += 0;
        issues.push("1単語だけでは変更内容が伝わりません。");
        suggestions.push("`fix bug` ではなく `fix(auth): ログインエラーを修正する` のように具体的に。");
      } else {
        aspectScores.summary = 5;
        score += 5;
        issues.push("もう少し具体的に書くと良いでしょう。");
      }
    }
  } else {
    // summaryなし
    issues.push("変更内容が全く書かれていません。");
    suggestions.push("必ず変更内容を要約してください。");
  }

  // --- 4. Why・背景の説明 / 20点 ---
  // ★ ルールベースのスコアを記録（後でAI評価に置き換えられる）
  if (body.length > 0) {
    aspectScores.why = 20;
    score += 20;
  } else if (summary.includes("ため") || summary.includes("ように") || summary.includes("ため")) {
    aspectScores.why = 14;
    score += 14;
  } else if (summary.length < 20 && /typo|fix|軽微|微修正|minor/i.test(summary)) {
    aspectScores.why = 12;
    score += 12;
  } else if (summary.length > 30 && !/fix|bug|typo/i.test(summary) && !isJapanese(summary)) {
    aspectScores.why = 14;
    score += 14;
    suggestions.push("必要に応じて本文（body）に変更理由を追記すると良いです。");
  } else {
    // Why情報なし
  }

  // --- 5. 読みやすさ / 10点 ---
  const len = firstLine.length;
  if (len >= 10 && len <= 72) {
    aspectScores.readability = 10;
    score += 10;
  } else if (len >= 5 && len <= 100) {
    aspectScores.readability = 6;
    score += 6;
    issues.push("1行の文字数が推奨範囲（10〜72文字）を超えています。");
    suggestions.push("72文字以内に収める読みやすいコミットメッセージを心がけてください。");
  } else {
    aspectScores.readability = 2;
    score += 2;
    issues.push("1行の文字数が適切ではありません。");
    suggestions.push("10〜72文字程度に要約してください。");
  }

  // --- 6. 業務での追跡しやすさ / 10点 ---
  const hasIssueNumber = /#[0-9]+|issue|JIRA|PROJ-\d+/i.test(message);
  const hasScope = scope.length > 0;
  const hasFeatureName = /画面|機能|ページ|ボタン|モーダル|フォーム|テーブル|ヘッダー|フッター|サイドバー/.test(summary);

  if (hasIssueNumber || (hasScope && hasFeatureName)) {
    aspectScores.traceability = 10;
    score += 10;
  } else if (hasScope) {
    aspectScores.traceability = 6;
    score += 6;
  }

  // --- ランク判定 ---
  const rank = getRank(score);

  // --- 改善例の生成 ---
  const exampleMessage = generateExample(type, scope, summary, message);

  return { score, rank, aspectScores, issues, suggestions, exampleMessage };
}

/**
 * ルールベース評価（観点1,2,5,6）とAI評価（観点3,4）を統合する
 * @param ruleResult evaluateCommit() の結果
 * @param aiResult aiEvaluateCommit() の結果（null=AI未評価ならルール結果をそのまま）
 */
export function combineWithAi(
  ruleResult: CommitEvaluationResult,
  aiResult: { summaryScore: number; whyScore: number; issues: string[]; suggestions: string[]; exampleMessage: string } | null,
): CommitEvaluationResult {
  if (!aiResult) return ruleResult;

  const { aspectScores } = ruleResult;

  // ルール: 観点1+2+5+6 (55点満点) + AI: 観点3+4 (45点満点)
  const combinedScore =
    aspectScores.format +
    aspectScores.type +
    aiResult.summaryScore +
    aiResult.whyScore +
    aspectScores.readability +
    aspectScores.traceability;

  const rank = getRank(combinedScore);

  // issues/suggestions はAIとルールを統合（重複除去）
  const allIssues = [...new Set([...ruleResult.issues, ...aiResult.issues])];
  const allSuggestions = [...new Set([...ruleResult.suggestions, ...aiResult.suggestions])];

  return {
    score: combinedScore,
    rank,
    aspectScores: {
      ...aspectScores,
      summary: aiResult.summaryScore,
      why: aiResult.whyScore,
    },
    issues: allIssues,
    suggestions: allSuggestions,
    // AIのexampleMessageを優先（より良い例を生成できるため）
    exampleMessage: aiResult.exampleMessage || ruleResult.exampleMessage,
  };
}

function isJapanese(text: string): boolean {
  return /[　-鿿豈-﫿]/.test(text);
}

function containsSpecificInfo(summary: string): boolean {
  // 固有名詞 or 具体的な機能名が含まれているか
  const specificPatterns = [
    /ログイン/, /認証/, /エラー/, /ボタン/, /画面/, /ページ/,
    /API/, /DB/, /テーブル/, /フォーム/, /一覧/, /検索/,
    /導入/, /設定/, /移行/, /初期化/, /構成/, /セットアップ/, /プロジェクト/, /環境/,
    /追加|更新|削除|修正|作成|実装/,
    /auth|login|button|form|table|search|filter|modal|dialog/i,
    /setup|init|config|migrate|upgrade|install|deploy/i,
    /component|module|service|util|helper|middleware|plugin|hook/i,
    /readme|license|ci|github|docker|package|version/i,
    /テスト|ユニット|モック|スタブ|バグ|パッチ|ホットフィックス/,
    /デプロイ|ビルド|リリース|ロールバック|パイプライン/,
    /追加|更新|削除|修正|作成|実装|変更|除外|整理|統合|分離/,
    /git|css|html|jsx|tsx|json|yaml|md|svg/,
    /ファイル|フォルダ|ディレクトリ|パッケージ|依存|import/,
    /コンフィグ|設定ファイル|環境変数|シークレット|トークン/,
    /クラス|インターフェース|型|定数|列挙/,
    /初期|初回|最初|first|initial/i,
  ];
  return specificPatterns.some((p) => p.test(summary));
}

function generateExample(type: string, scope: string, summary: string, original: string): string {
  // ① typeがなく日本語のみのメッセージ → 典型的な改善例を提示
  if (!type && !isJapanese(original)) {
    if (original.includes("修正") || original.includes("fix")) {
      return "fix(auth): ログイン時のエラー処理を修正する";
    }
    if (original.includes("追加") || original.includes("add") || original.includes("feat")) {
      return "feat(dashboard): リポジトリ切り替え機能を追加する";
    }
    return "feat(scope): 変更内容の要約をここに書く";
  }

  // ② typeが不正 → 推測して修正
  if (!type || !VALID_TYPES.includes(type)) {
    const inferredType = original.includes("追加") || original.includes("add") ? "feat" : "fix";
    return `${inferredType}(${scope || "scope"}): ${summary}`;
  }

  // ③ scopeがない → 追加を促す
  if (!scope && type) {
    return `${type}(scope): ${summary}`;
  }

  // ④ summaryが短すぎる
  if (summary.length < 10) {
    return `${type}(${scope || "scope"}): 変更内容の具体的な要約をここに書く`;
  }

  // ⑤ summaryが10文字以上でも具体性が不足 → 拡張した改善例を生成
  if (!containsSpecificInfo(summary)) {
    return generateExpandedExample(type, scope);
  }

  // ⑥ 十分良い形式 → 現状維持
  return `${type}${scope ? `(${scope})` : ""}: ${summary}`;
}

/**
 * summaryが具体性不足のときに、 type/scope に基づいて拡張した改善例を生成する
 */
function generateExpandedExample(type: string, scope: string): string {
  // typeごとのテンプレート
  const templates: Record<string, string[]> = {
    chore: [
      `${type}(${scope}): ${scope}周りのプロジェクト設定を導入する`,
      `${type}(${scope}): ${scope}の初期構成をセットアップする`,
    ],
    feat: [
      `${type}(${scope}): ${scope}に〜機能を追加する`,
      `${type}(${scope}): ${scope}の〜処理を実装する`,
    ],
    fix: [
      `${type}(${scope}): ${scope}の〜エラーを修正する`,
      `${type}(${scope}): ${scope}の〜問題を修正する`,
    ],
    refactor: [
      `${type}(${scope}): ${scope}の〜処理をリファクタリングする`,
    ],
    docs: [
      `${type}(${scope}): ${scope}のドキュメントを追加・更新する`,
    ],
    style: [
      `${type}(${scope}): ${scope}のスタイルを調整する`,
    ],
    test: [
      `${type}(${scope}): ${scope}のテストを追加する`,
    ],
    build: [
      `${type}(${scope}): ${scope}のビルド設定を変更する`,
    ],
    ci: [
      `${type}(${scope}): ${scope}のCI設定を変更する`,
    ],
    perf: [
      `${type}(${scope}): ${scope}のパフォーマンスを改善する`,
    ],
  };

  const candidates = templates[type];
  if (candidates && candidates.length > 0) {
    return candidates[0];
  }

  // typeが不明な場合のフォールバック
  return `${type}(${scope}): ${scope}に関する具体的な変更内容`;
}
