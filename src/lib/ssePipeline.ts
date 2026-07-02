import type { GitHubCommit } from "@/lib/github";

const AI_CALL_DELAY_MS = 400;

/**
 * 3フェーズ（fetch→rule→ai）のSSEパイプラインを実行する
 *
 * @param commits GitHubから取得したコミット一覧
 * @param send SSEイベント送信関数
 * @param handlers.onRuleItem Phase2: 各コミットのルール評価（DB保存もここで）
 * @param handlers.onAiItem  Phase3: 各コミットのAI評価（DB更新もここで）
 * @param handlers.getScore  アイテムからスコアを取得（型Tに依存するため）
 */
export async function runSSEPipeline<T>(
  commits: GitHubCommit[],
  send: (event: string, data: unknown) => void,
  onRuleItem: (commit: GitHubCommit, index: number, total: number) => Promise<T>,
  onAiItem: (item: T, commit: GitHubCommit, index: number, total: number) => Promise<T>,
  getScore: (item: T) => number,
): Promise<{ items: T[]; initialAvg: number; currentAvg: number }> {
  // Phase 2: Rule evaluation
  send("phase", { name: "rule", message: "ルールベース評価中..." });
  const ruleItems: T[] = [];

  for (let i = 0; i < commits.length; i++) {
    const item = await onRuleItem(commits[i], i, commits.length);
    ruleItems.push(item);
    send("progress", { phase: "rule", current: i + 1, total: commits.length });
  }

  const initialAvg = calcAvg(ruleItems, getScore);

  send("rule_complete", {
    commits: ruleItems,
    totalCount: ruleItems.length,
    initialAvg,
    estimatedAiSeconds: Math.round(commits.length * 1.5),
  });

  // Phase 3: AI evaluation
  send("phase", { name: "ai", message: "AI評価中..." });
  const startTime = Date.now();
  const aiItems: T[] = [];

  for (let i = 0; i < ruleItems.length; i++) {
    const item = await onAiItem(ruleItems[i], commits[i], i, ruleItems.length);
    aiItems.push(item);

    if (i < ruleItems.length - 1) {
      await delay(AI_CALL_DELAY_MS);
    }

    const elapsed = (Date.now() - startTime) / 1000;
    const perItem = elapsed / (i + 1);
    const remaining = Math.round(perItem * (ruleItems.length - i - 1));

    send("ai_progress", {
      current: i + 1,
      total: ruleItems.length,
      currentMessage: commits[i].commit.message.slice(0, 60),
      score: getScore(item),
      estimatedSecondsRemaining: remaining,
    });
  }

  const currentAvg = calcAvg(aiItems, getScore);

  send("ai_complete", {
    commits: aiItems,
    totalCount: aiItems.length,
    initialAvg,
    currentAvg,
  });

  return { items: aiItems, initialAvg, currentAvg };
}

function calcAvg<T>(items: T[], getScore: (item: T) => number): number {
  if (items.length === 0) return 0;
  const total = items.reduce((s, item) => s + getScore(item), 0);
  return Math.round(total / items.length);
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
