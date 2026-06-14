type CommitEvaluationResult = {
  score: number;
  rank: "excellent" | "good" | "needs_improvement" | "poor";
  issues: string[];
  suggestions: string[];
  exampleMessage: string;
};

// Conventional Commits の type一覧
const VALID_TYPES = [
  "feat", "fix", "docs", "refactor", "test",
  "style", "chore", "build", "ci", "perf",
];

// type(scope): summary の形式をパースする正規表現
const CONVENTIONAL_REGEX = /^(\w+)(?:\(([^)]+)\))?:\s(.+)/;

export function evaluateCommit(message: string): CommitEvaluationResult {
  const issues: string[] = [];
  const suggestions: string[] = [];
  const firstLine = message.split("\n")[0];
  const body = message.split("\n").slice(2).join("\n").trim();

  let score = 0;

  // --- 1. 形式の明確さ / 20点 ---
  const match = firstLine.match(CONVENTIONAL_REGEX);
  let type = "";
  let scope = "";
  let summary = firstLine;

  if (match) {
    type = match[1];
    scope = match[2] || "";
    summary = match[3];
    score += scope ? 20 : 16;
  } else if (/^(fix|feat|update|add|remove|change|refactor|fixup|修正)/i.test(firstLine)) {
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

  // --- 2. 変更種別の適切さ / 15点 ---
  if (type && VALID_TYPES.includes(type)) {
    score += 15;
  } else if (type) {
    const closeMatch = VALID_TYPES.find((t) => type.startsWith(t) || t.startsWith(type));
    if (closeMatch) {
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
  if (summary.length >= 10 && summary.length <= 100) {
    if (containsSpecificInfo(summary)) {
      score += 25;
    } else if (summary.length >= 15) {
      score += 15;
      issues.push("変更内容はある程度伝わりますが、固有名詞（機能名・画面名など）を入れるとさらに良くなります。");
      suggestions.push("例: `認証機能を追加する` ではなく `Googleログイン機能を追加する` のように具体的に。");
    } else {
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
        score += 5;
        issues.push("もう少し具体的に書くと良いでしょう。");
      }
    }
  } else {
    // summaryなし
    score += 0;
    issues.push("変更内容が全く書かれていません。");
    suggestions.push("必ず変更内容を要約してください。");
  }

  // --- 4. Why・背景の説明 / 20点 ---
  if (body.length > 0) {
    score += 20;
  } else if (summary.includes("ため") || summary.includes("ように") || summary.includes("\u305f\u3081")) {
    score += 14;
  } else if (summary.length < 20 && /typo|fix|軽微|微修正|minor/i.test(summary)) {
    score += 12;
  } else if (summary.length > 30 && !/fix|bug|typo/i.test(summary) && !isJapanese(summary)) {
    score += 14;
    suggestions.push("必要に応じて本文（body）に変更理由を追記すると良いです。");
  } else {
    // Why情報なし
  }

  // --- 5. 読みやすさ / 10点 ---
  const len = firstLine.length;
  if (len >= 10 && len <= 72) {
    score += 10;
  } else if (len >= 5 && len <= 100) {
    score += 6;
    issues.push("1行の文字数が推奨範囲（10〜72文字）を超えています。");
    suggestions.push("72文字以内に収める読みやすいコミットメッセージを心がけてください。");
  } else {
    score += 2;
    issues.push("1行の文字数が適切ではありません。");
    suggestions.push("10〜72文字程度に要約してください。");
  }

  // --- 6. 業務での追跡しやすさ / 10点 ---
  const hasIssueNumber = /#[0-9]+|issue|JIRA|PROJ-\d+/i.test(message);
  const hasScope = scope.length > 0;
  const hasFeatureName = /画面|機能|ページ|ボタン|モーダル|フォーム|テーブル|ヘッダー|フッター|サイドバー/.test(summary);

  if (hasIssueNumber || (hasScope && hasFeatureName)) {
    score += 10;
  } else if (hasScope) {
    score += 6;
  }

  // --- ランク判定 ---
  const rank: CommitEvaluationResult["rank"] =
    score >= 90 ? "excellent" :
    score >= 70 ? "good" :
    score >= 50 ? "needs_improvement" :
    "poor";

  // --- 改善例の生成 ---
  const exampleMessage = generateExample(type, scope, summary, message);

  return { score, rank, issues, suggestions, exampleMessage };
}

function isJapanese(text: string): boolean {
  return /[\u3000-\u9FFF\uF900-\uFAFF]/.test(text);
}

function containsSpecificInfo(summary: string): boolean {
  // 固有名詞 or 具体的な機能名が含まれているか
  const specificPatterns = [
    /ログイン/, /認証/, /エラー/, /ボタン/, /画面/, /ページ/,
    /API/, /DB/, /テーブル/, /フォーム/, /一覧/, /検索/,
    /追加|更新|削除|修正|作成|実装/,
    /auth|login|button|form|table|search|filter|modal|dialog/,
  ];
  return specificPatterns.some((p) => p.test(summary));
}

function generateExample(type: string, scope: string, summary: string, original: string): string {
  if (!type && !isJapanese(original)) {
    // 日本語だけのメッセージ
    if (original.includes("修正") || original.includes("fix")) {
      return "fix(auth): ログイン時のエラー処理を修正する";
    }
    if (original.includes("追加") || original.includes("add") || original.includes("feat")) {
      return "feat(dashboard): リポジトリ切り替え機能を追加する";
    }
    return "feat(scope): 変更内容の要約をここに書く";
  }

  if (!type || !VALID_TYPES.includes(type)) {
    // typeが不正
    const inferredType = original.includes("追加") || original.includes("add") ? "feat" : "fix";
    return `${inferredType}(${scope || "scope"}): ${summary}`;
  }

  if (!scope && type) {
    return `${type}(scope): ${summary}`;
  }

  // typeとscopeはあるがsummaryが不十分
  if (summary.length < 10) {
    return `${type}(${scope || "scope"}): 変更内容の具体的な要約をここに書く`;
  }

  // 十分良い形式だが参考例を表示
  return `${type}${scope ? `(${scope})` : ""}: ${summary}`;
}
