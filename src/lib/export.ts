export type ExportCommit = {
  sha: string;
  message: string;
  authorName: string;
  committedAt: string;
  score: number;
  initialScore?: number;
  status?: string;
  firstIssue?: string | null;
  aspectScores?: {
    format: number;
    type: number;
    summary: number;
    why: number;
    readability: number;
    traceability: number;
  } | null;
};

function fmt(val: unknown): string {
  if (val === null || val === undefined) return "-";
  return String(val);
}

export function exportMarkdown(commits: ExportCommit[], repoName: string): string {
  const total = commits.length;
  const avgScore = total > 0
    ? Math.round(commits.reduce((s, c) => s + c.score, 0) / total)
    : 0;
  const hasInitial = commits.some((c) => c.initialScore != null);
  const initialAvg = hasInitial && total > 0
    ? Math.round(commits.reduce((s, c) => s + (c.initialScore ?? c.score), 0) / total)
    : null;
  const improvement = initialAvg != null ? avgScore - initialAvg : null;
  const needsImprovement = commits.filter((c) => c.score < 80).length;
  const excellent = commits.filter((c) => c.score >= 80).length;
  const improved = commits.filter((c) => c.status === "improved").length;
  const hasStatus = commits.some((c) => c.status);
  const hasAspect = commits.some((c) => c.aspectScores);

  const header = [
    "SHA",
    "メッセージ",
    "作者",
    "日付",
    "スコア",
    hasStatus ? "ステータス" : null,
    "問題点",
    ...(hasAspect ? ["形式", "種別", "具体性", "Why", "読み", "追跡"] : []),
  ].filter(Boolean);

  const separator = header.map((h) => "---").join(" | ");

  const rows = commits.map((c) => {
    const row = [
      `\`${c.sha.slice(0, 7)}\``,
      c.message.replace(/\n/g, " ").slice(0, 80),
      c.authorName,
      new Date(c.committedAt).toLocaleDateString("ja-JP"),
      `**${c.score}**`,
      hasStatus ? fmt(c.status) : null,
      c.firstIssue?.slice(0, 60) ?? "",
      ...(hasAspect && c.aspectScores
        ? [
            String(c.aspectScores.format),
            String(c.aspectScores.type),
            String(c.aspectScores.summary),
            String(c.aspectScores.why),
            String(c.aspectScores.readability),
            String(c.aspectScores.traceability),
          ]
        : hasAspect
          ? ["-", "-", "-", "-", "-", "-"]
          : []),
    ].filter((v) => v !== null);
    return row.join(" | ");
  });

  return [
    `# ${repoName} — コミット評価結果`,
    `エクスポート: ${new Date().toLocaleString("ja-JP")}`,
    "",
    "## サマリー",
    "",
    "| 指標 | 値 |",
    "| --- | --- |",
    `| 現在スコア | ${avgScore} / 100 |`,
    ...(initialAvg != null ? [`| 初期スコア | ${initialAvg} / 100 |`] : []),
    ...(improvement != null ? [`| 改善 | ${improvement >= 0 ? "+" : ""}${improvement} |`] : []),
    `| 全コミット | ${total} |`,
    `| 改善必要 | ${needsImprovement} |`,
    `| 改善済み | ${improved} |`,
    `| 優秀 | ${excellent} |`,
    "",
    "## コミット一覧",
    "",
    `| ${header.join(" | ")} |`,
    `| ${separator} |`,
    ...rows.map((r) => `| ${r} |`),
    "",
    "---",
    `*CommitHyper (https://commithyper.vercel.app) で生成*`,
    "",
  ].join("\n");
}

export function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
