import { SPECIFIC_PATTERNS } from "@/lib/specificPatterns";

// ランク閾値（一元管理）
export const SCORE = {
  EXCELLENT: 90,
  GOOD: 80,
  NEEDS_IMPROVEMENT: 50,
} as const;

// 観点別配点
export const WEIGHT = {
  FORMAT_SCOPE: 30,       // scopeあり
  FORMAT_NO_SCOPE: 15,    // scopeなし
  TYPE_VALID: 20,         // 標準type
  TYPE_CLOSE: 10,         // 近似type
  AI_SUMMARY_MAX: 20,     // AI: 具体性
  AI_WHY_MAX: 15,         // AI: Why
  READABILITY: 10,        // 読みやすさ
  TRACEABILITY: 5,        // 追跡性（scope or 課題番号）
} as const;

export type AspectScores = {
  format: number;        // 観点1: 形式の明確さ 0-30
  type: number;          // 観点2: 変更種別の適切さ 0-20
  summary: number;       // 観点3: Summaryの具体性 0-20（AI評価で上書き）
  why: number;           // 観点4: Why・背景の説明 0-15（AI評価で上書き）
  readability: number;   // 観点5: 読みやすさ 0-10
  traceability: number;  // 観点6: 業務での追跡しやすさ 0-5
};

export type CommitEvaluationResult = {
  score: number;
  rank: "excellent" | "good" | "needs_improvement" | "poor";
  issues: string[];
  suggestions: string[];
  exampleMessage: string;
  aspectScores: AspectScores;
};

// Conventional Commits の type一覧
const VALID_TYPES = [
  "feat", "fix", "docs", "refactor", "test",
  "style", "chore", "build", "ci", "perf",
];

const CONVENTIONAL_REGEX = /^(\w+)(?:\(([^)]+)\))?:\s(.+)/;
const TYPE_SCOPE_NO_COLON = /^(fix|feat|chore|docs|refactor|test|style|build|ci|perf)\(([^)]+)\)\s(.+)/i;

function getRank(score: number): CommitEvaluationResult["rank"] {
  return score >= SCORE.EXCELLENT ? "excellent" :
    score >= SCORE.GOOD ? "good" :
    score >= SCORE.NEEDS_IMPROVEMENT ? "needs_improvement" :
    "poor";
}

export function isMergeMessage(message: string): boolean {
  return /^merge\b/i.test(message.trim());
}

export function evaluateCommit(message: string): CommitEvaluationResult {
  const issues: string[] = [];
  const suggestions: string[] = [];
  const firstLine = message.split("\n")[0];
  const body = message.split("\n").slice(2).join("\n").trim();

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
  const isFirstCommit = /^(initial|first)\s+commit/i.test(firstLine);
  if (isFirstCommit) {
    return {
      score: 55,
      rank: "needs_improvement",
      aspectScores: { format: 0, type: 0, summary: 0, why: 0, readability: 0, traceability: 0 },
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

  if (isMergeMessage(message)) {
    return {
      score: 55,
      rank: "needs_improvement",
      aspectScores: { format: 0, type: 0, summary: 0, why: 0, readability: 0, traceability: 0 },
      issues: [
        "自動生成メッセージのため Conventional Commits 形式ではありません",
      ],
      suggestions: [
        "squash merge を使うと `feat(scope): summary` 形式で統一されスコアが上がります",
      ],
      exampleMessage: "feat(dashboard): ソート機能を統合する",
    };
  }

  // --- 1. 形式の明確さ / 30点（最重要） ---
  const match = firstLine.match(CONVENTIONAL_REGEX);
  let type = "";
  let scope = "";
  let summary = firstLine;

  if (match) {
    type = match[1];
    scope = match[2] || "";
    summary = match[3];
    if (scope) {
      aspectScores.format = WEIGHT.FORMAT_SCOPE;
    } else {
      aspectScores.format = WEIGHT.FORMAT_NO_SCOPE;
      issues.push("scope（影響範囲）が省略されています。変更範囲を明示するとスコアが大きく上がります。");
      suggestions.push("例: `feat(auth): 〜` のようにscopeを追加してください。");
    }
    score += aspectScores.format;
  } else {
    const partialMatch = firstLine.match(TYPE_SCOPE_NO_COLON);
    if (partialMatch) {
      type = partialMatch[1];
      scope = partialMatch[2] || "";
      summary = partialMatch[3];
      aspectScores.format = 10;
      score += 10;
      issues.push("`type(scope) ` の後にコロン（:）がありません。");
      suggestions.push("`type(scope): summary` の形式でコロンを入れてください。");
    } else if (/^(fix|feat|update|add|remove|change|refactor|fixup|修正)/i.test(firstLine)) {
      aspectScores.format = 5;
      score += 5;
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

  // --- 2. 変更種別の適切さ ---
  if (type && VALID_TYPES.includes(type)) {
    aspectScores.type = WEIGHT.TYPE_VALID;
    score += WEIGHT.TYPE_VALID;
  } else if (type) {
    const closeMatch = VALID_TYPES.find((t) => type.startsWith(t) || t.startsWith(type));
    if (closeMatch) {
      aspectScores.type = WEIGHT.TYPE_CLOSE;
      score += WEIGHT.TYPE_CLOSE;
      issues.push(`変更種別 \`${type}\` は \`${closeMatch}\` に近い表記です。統一を推奨します。`);
      suggestions.push(`\`${type}\` ではなく \`${closeMatch}\` を使ってください。`);
    } else {
      issues.push(`変更種別 \`${type}\` は一般的ではありません。`);
      suggestions.push(`feat / fix / refactor / chore など標準的な type を使ってください。`);
    }
  } else {
    // typeがない
  }

  // --- 3. Summaryの具体性 / 20点（AI評価で上書き） ---
  if (summary.length >= 10 && summary.length <= 100) {
    if (containsSpecificInfo(summary)) {
      aspectScores.summary = 20;
      score += 20;
    } else if (summary.length >= 15) {
      aspectScores.summary = 10;
      score += 10;
      issues.push("変更内容はある程度伝わりますが、固有名詞（機能名・画面名など）を入れるとさらに良くなります。");
      suggestions.push("例: `認証機能を追加する` ではなく `Googleログイン機能を追加する` のように具体的に。");
    } else {
      aspectScores.summary = 3;
      score += 3;
      issues.push("変更内容が曖昧です。何を変更したか具体的に書いてください。");
      suggestions.push("変更した機能・画面・処理の名前を含めてください。");
    }
  } else if (summary.length > 100) {
    if (containsSpecificInfo(summary)) {
      aspectScores.summary = 10;
      score += 10;
    } else {
      aspectScores.summary = 5;
      score += 5;
    }
    issues.push("100文字を超えています。summaryは簡潔に（72文字以内）要約し、詳細はbodyに移してください。");
    suggestions.push("例: `fix(api): SSEパイプラインの中断処理を実装する` として、詳細はbodyに箇条書きで");
  } else if (summary.length > 0) {
    if (isJapanese(summary) && summary.length <= 4) {
      issues.push("変更内容が短すぎて何をしたか分かりません。");
      suggestions.push("具体的な変更内容を書いてください。例: `ログインエラーの表示を修正する`");
    } else {
      const words = summary.split(/\s+/);
      if (words.length === 1 && words[0].length < 6) {
        issues.push("1単語だけでは変更内容が伝わりません。");
        suggestions.push("`fix bug` ではなく `fix(auth): ログインエラーを修正する` のように具体的に。");
      } else {
        aspectScores.summary = 3;
        score += 3;
        issues.push("もう少し具体的に書くと良いでしょう。");
      }
    }
  } else {
    issues.push("変更内容が全く書かれていません。");
    suggestions.push("必ず変更内容を要約してください。");
  }

  // --- 4. Why・背景の説明 / 15点（AI評価で上書き） ---
  if (body.length >= 15) {
    aspectScores.why = 15;
    score += 15;
  } else if (body.length > 0) {
    aspectScores.why = 5;
    score += 5;
    issues.push("本文（body）が短すぎます。変更理由や背景を具体的に説明してください。");
  } else if (summary.includes("ため") || summary.includes("ように") || summary.includes("なぜ")) {
    aspectScores.why = 10;
    score += 10;
  } else if (summary.length < 20 && /typo|fix|軽微|微修正|minor/i.test(summary)) {
    aspectScores.why = 8;
    score += 8;
  } else if (containsSpecificInfo(summary) && summary.length >= 15) {
    aspectScores.why = 3;
    score += 3;
    suggestions.push("なぜこの変更が必要かを本文（body）に書くとスコアが上がります。");
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

  // --- 6. 業務での追跡しやすさ / 5点 ---
  const hasIssueNumber = /#[0-9]+|issue|JIRA|PROJ-\d+/i.test(message);
  const hasScope = scope.length > 0;

  if (hasIssueNumber || hasScope) {
    aspectScores.traceability = WEIGHT.TRACEABILITY;
    score += WEIGHT.TRACEABILITY;
  }

  // --- 制限理由の付与 ---
  // scopeがない場合、形式の観点で減点されている理由を明確に
  if (!scope && aspectScores.format >= 15) {
    // scopeがあれば+15点取れたことを示唆
    issues.push("scopeがないため観点1（形式）で15/30点に留まっています。scopeを追加すると+15点されます。");
  }

  // scopeなし: Conventional Commitsとして不完全 → good未満に制限
  if (!scope && !hasIssueNumber) {
    score = Math.min(score, SCORE.GOOD - 1);
  }

  const rank = getRank(score);
  const exampleMessage = generateExample(type, scope, summary, message);

  return { score, rank, aspectScores, issues, suggestions, exampleMessage };
}

/**
 * ルールベース評価（観点1,2,5,6）とAI評価（観点3,4）を統合する
 */
const CONTRADICTORY_ISSUES = [
  /変更内容が全く書かれていません/,
  /何を変更したか分かりません/,
  /変更内容が書かれていない/,
  /何も書かれていません/,
  /bodyが空/,
  /なぜ変更したか(不明|分かりません|書かれていません)/,
  /背景が(不明|分かりません|書かれていない)/,
  /Whyが(不明|分かりません|書かれていない|不足)/,
];

function filterContradictoryIssues(
  issues: string[],
  ruleAspects: AspectScores,
): string[] {
  const hasSpecificInfo = ruleAspects.summary >= 20;
  const hasBody = ruleAspects.why >= 15;

  return issues.filter((issue) => {
    for (const pattern of CONTRADICTORY_ISSUES) {
      if (!pattern.test(issue)) continue;
      if (hasSpecificInfo && /(変更内容|何を変更|何も)/i.test(issue)) return false;
      if (hasBody && /(body|なぜ|Why|背景)/i.test(issue)) return false;
    }
    return true;
  });
}

export function combineWithAi(
  ruleResult: CommitEvaluationResult,
  aiResult: {
    summaryScore: number;
    whyScore: number;
    suggestedScope: string;
    issues: string[];
    suggestions: string[];
    exampleMessage: string;
  } | null,
): CommitEvaluationResult {
  if (!aiResult) return ruleResult;

  const { aspectScores } = ruleResult;

  // ルール: 観点1+2+5+6 (65点満点) + AI: 観点3+4 (35点満点)
  let combinedScore =
    aspectScores.format +
    aspectScores.type +
    aiResult.summaryScore +
    aiResult.whyScore +
    aspectScores.readability +
    aspectScores.traceability;

  // scopeなし: good未満に制限
  if (aspectScores.traceability === 0) {
    combinedScore = Math.min(combinedScore, SCORE.GOOD - 1);
  }

  const rank = getRank(combinedScore);

  // issues/suggestions はAIとルールを統合（重複除去）
  const filteredAiIssues = filterContradictoryIssues(aiResult.issues, aspectScores);
  const allIssues = [...new Set([...ruleResult.issues, ...filteredAiIssues])];
  const allSuggestions = [...new Set([...ruleResult.suggestions, ...aiResult.suggestions])];

  // AIがscope提案をしている場合、suggestionsに追加
  if (aiResult.suggestedScope && aiResult.suggestedScope.length > 0) {
    allSuggestions.push(
      `scopeを \`${aiResult.suggestedScope}\` に変更すると、より変更内容と一致します。`,
    );
  }

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
    exampleMessage: aiResult.exampleMessage || ruleResult.exampleMessage,
  };
}

function isJapanese(text: string): boolean {
  return /[　-鿿豈-﫿]/.test(text);
}

function containsSpecificInfo(summary: string): boolean {
  let matchedLength = 0;
  for (const p of SPECIFIC_PATTERNS) {
    const m = summary.match(p);
    if (m) matchedLength += m[0].length;
  }
  return matchedLength >= 2;
}

function generateExample(type: string, scope: string, summary: string, original: string): string {
  // 自動生成メッセージ（Merge branch等）の検出
  if (isMergeMessage(original) && !type) {
    return "feat(scope): developブランチの変更を統合する\n\n- チームメンバーの変更を取り込み\n- コンフリクトを解決";
  }

  if (!type && !isJapanese(original)) {
    if (original.includes("修正") || original.includes("fix")) {
      return "fix(auth): ログイン時のエラー処理を修正する\n\n- 無効なトークンで401が返らない問題を修正\n- エラーメッセージをユーザーに表示";
    }
    if (original.includes("追加") || original.includes("add") || original.includes("feat")) {
      return "feat(dashboard): リポジトリ切り替え機能を追加する\n\n- ヘッダーにドロップダウンセレクタを設置\n- 選択したリポジトリに遷移";
    }
    if (original.includes("削除") || original.includes("remove") || original.includes("delete") || original.includes("clean")) {
      return "chore(deps): 使用していない依存関係を削除する\n\n- 不要になったlodashの参照を除去\n- package.jsonをクリーンアップ";
    }
    // 汎用フォールバック
    return "feat(scope): 変更内容を具体的に記述する\n\n- 何を・なぜ変更したかを箇条書きで説明";
  }

  if (!type || !VALID_TYPES.includes(type)) {
    const inferredType = original.includes("追加") || original.includes("add") ? "feat" : "fix";
    return `${inferredType}(${scope || "scope"}): ${summary}`;
  }

  if (!scope && type) {
    return `${type}(scope): ${summary}`;
  }

  if (summary.length < 10) {
    return `${type}(${scope || "scope"}): 変更内容の具体的な要約をここに書く`;
  }

  if (!containsSpecificInfo(summary)) {
    return generateExpandedExample(type, scope);
  }

  return `${type}${scope ? `(${scope})` : ""}: ${summary}`;
}

function generateExpandedExample(type: string, scope: string): string {
  const templates: Record<string, string> = {
    chore: `${type}(${scope}): ${scope}に〇〇の設定を追加する

- Tailwind CSSのカスタムテーマを定義
- 基本のカラーパレットとフォント設定を追加`,
    feat: `${type}(${scope}): ${scope}に〇〇機能を追加する

- 〇〇画面に××の入り口を設置
- Auth.js v5でコールバック処理を実装
- ログイン後はダッシュボードにリダイレクト`,
    fix: `${type}(${scope}): ${scope}の××問題を修正する

- GitHub APIが空配列を返した場合の500エラーを修正
- 早期リターンで空配列をそのまま返すよう変更`,
    refactor: `${type}(${scope}): ${scope}の〇〇処理を改善する

- N+1問題を解消しレスポンス時間を1/3に改善
- ループ内クエリをprismaのincludeで一度にJOIN`,
    test: `${type}(${scope}): ${scope}の〇〇テストを追加する

- ログイン処理の正常系・異常系テスト
- エラーハンドリングのテストケース追加`,
    docs: `${type}(${scope}): ${scope}のドキュメントを追加する

- APIエンドポイント一覧とリクエスト形式
- セットアップ手順をREADMEに追記`,
    style: `${type}(${scope}): ${scope}のスタイルを調整する

- ボタンのホバー色をブランドカラーに統一`,
    build: `${type}(${scope}): ${scope}のビルド設定を変更する

- 使用していない依存関係を削除
- バンドルサイズを最適化`,
    ci: `${type}(${scope}): ${scope}のCI設定を変更する

- GitHub Actionsにlintチェックを追加
- Nodeバージョンを20にアップデート`,
    perf: `${type}(${scope}): ${scope}のパフォーマンスを改善する

- 画像の遅延読み込みを導入
- メモ化で不要な再レンダリングを防止`,
  };

  return templates[type] || `${type}(${scope}): ${scope}に関する具体的な変更内容`;
}
