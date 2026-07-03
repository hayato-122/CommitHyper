import type { GitHubCommit } from "@/lib/github";
import { evaluateCommit, combineWithAi } from "@/lib/evaluateCommit";
import { aiEvaluateCommit, aiEvaluateBatch, clearBatchCache, isAiRpdExceeded } from "@/lib/aiEvaluate";

export async function evaluateWithAi(
  message: string,
  options?: { signal?: AbortSignal },
): Promise<{ combined: ReturnType<typeof combineWithAi>; aiResult: Awaited<ReturnType<typeof aiEvaluateCommit>> }> {
  const ruleResult = evaluateCommit(message);
  const aiResult = await aiEvaluateCommit(message, options);
  const combined = combineWithAi(ruleResult, aiResult);
  return { combined, aiResult };
}

const BATCH_SIZE = 3;
const RPM_DELAY_MS = 4000;

export async function runSSEPipeline<T>(
  commits: GitHubCommit[],
  send: (event: string, data: unknown) => void,
  onRuleItem: (commit: GitHubCommit, index: number, total: number) => Promise<T>,
  onAiItem: (item: T, commit: GitHubCommit, index: number, total: number) => Promise<T>,
  getScore: (item: T) => number,
  options?: { signal?: AbortSignal },
): Promise<{ items: T[]; initialAvg: number; currentAvg: number }> {
  const signal = options?.signal;

  function isCancelled(): boolean {
    return signal?.aborted ?? false;
  }

  // Phase 2: Rule evaluation
  send("phase", { name: "rule", message: "ルールベース評価中..." });
  const ruleItems: T[] = [];

  for (let i = 0; i < commits.length; i++) {
    if (isCancelled()) break;
    const item = await onRuleItem(commits[i], i, commits.length);
    ruleItems.push(item);
    send("progress", { phase: "rule", current: i + 1, total: commits.length });
  }

  const initialAvg = calcAvg(ruleItems, getScore);

  send(isCancelled() ? "cancelled" : "rule_complete", {
    commits: ruleItems,
    totalCount: ruleItems.length,
    initialAvg,
    estimatedAiSeconds: Math.round(commits.length * 1.5),
  });

  if (isCancelled()) {
    return { items: ruleItems, initialAvg, currentAvg: initialAvg };
  }

  // Phase 3: AI evaluation
  send("phase", { name: "ai", message: "AI評価中..." });
  const startTime = Date.now();
  const aiItems: T[] = [];

  // Phase 3a: Batch-precompute AI results
  clearBatchCache();
  let rpdExceeded = false;

  for (let batchStart = 0; batchStart < ruleItems.length; batchStart += BATCH_SIZE) {
    if (isCancelled()) break;

    const batchEnd = Math.min(batchStart + BATCH_SIZE, ruleItems.length);
    const batchMessages = commits.slice(batchStart, batchEnd).map((c) => c.commit.message);

    const results = await aiEvaluateBatch(batchMessages, options);

    if (results.every((r) => r === null)) {
      if (isAiRpdExceeded()) {
        rpdExceeded = true;
        break;
      }
    }

    if (batchEnd < ruleItems.length) {
      await delay(RPM_DELAY_MS);
    }
  }

  if (rpdExceeded) {
    send("rpd_exceeded", { message: "1日のAI評価上限(20件)に達しました。ルールベースの評価のみ表示します。" });
  }

  // Phase 3b: Apply AI results through per-commit callbacks (cache hits, no API calls)
  for (let i = 0; i < ruleItems.length; i++) {
    if (isCancelled()) break;
    const item = await onAiItem(ruleItems[i], commits[i], i, ruleItems.length);
    aiItems.push(item);

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

  send(isCancelled() ? "cancelled" : "ai_complete", {
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
