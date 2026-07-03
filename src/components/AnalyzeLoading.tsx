"use client";

import { GitFork } from "lucide-react";
import type { AnalyzeState } from "@/hooks/useSSEAnalysis";

type Props = {
  owner: string;
  name: string;
  state: AnalyzeState;
};

export function AnalyzeLoading({ owner, name, state }: Props) {
  const total = state.total || 0;
  const current = state.current || 0;
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  const isAiPhase = state.phase === "ai";
  const estimatedSec = state.estimatedSecondsRemaining ?? 0;
  const estimatedMin = Math.ceil(estimatedSec / 60);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-pearl px-6">
      <div className="w-full max-w-lg">
        <div className="mb-10 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-teal">
            <GitFork className="h-7 w-7 text-white" />
          </div>
          <h1
            className="text-heading font-semibold text-midnight-ink"
            style={{ fontFamily: "var(--font-dm-sans), var(--font-noto-sans-jp), sans-serif" }}
          >
            {owner}/{name}
          </h1>
          <p className="mt-2 text-body text-zinc-500">
            コミットを分析しています
          </p>
        </div>

        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-body-sm">
            <span className="font-medium text-zinc-700">
              {isAiPhase ? `AI評価 ${current}/${total}` : "準備中..."}
            </span>
            {isAiPhase && <span className="text-zinc-500">{percent}%</span>}
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-mist">
            <div
              className="h-full rounded-full bg-brand-teal transition-all duration-500"
              style={{ width: `${isAiPhase ? percent : 10}%` }}
            />
          </div>
          {isAiPhase && estimatedSec > 0 && (
            <p className="mt-2 text-caption text-zinc-400">
              残り約 {estimatedMin} 分
            </p>
          )}
        </div>

        <div className="mb-6 space-y-2">
          <div className="flex items-center gap-3 rounded-xl border border-mist bg-white px-4 py-3">
            {state.phase === "fetch" ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-teal border-t-transparent" />
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-teal text-[10px] text-white">✓</span>
            )}
            <span className={`text-body-sm ${state.phase === "fetch" ? "text-midnight-ink font-medium" : "text-zinc-500"}`}>
              GitHubからコミットを取得
              {state.phase !== "fetch" && `（${total}件）`}
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-mist bg-white px-4 py-3">
            {state.phase === "fetch" ? (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 text-[10px] text-zinc-400">—</span>
            ) : state.phase === "rule" ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-teal border-t-transparent" />
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-teal text-[10px] text-white">✓</span>
            )}
            <span className={`text-body-sm ${state.phase === "rule" ? "text-midnight-ink font-medium" : state.phase === "fetch" ? "text-zinc-400" : "text-zinc-500"}`}>
              ルールベース評価
              {state.initialAvg != null && `（平均 ${state.initialAvg}点）`}
            </span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-brand-teal/20 bg-white px-4 py-3">
            {isAiPhase ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-teal border-t-transparent" />
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 text-[10px] text-zinc-400">—</span>
            )}
            <span className={`text-body-sm ${isAiPhase ? "text-midnight-ink font-medium" : "text-zinc-400"}`}>
              AI評価{isAiPhase ? ` ${current}/${total}` : ""}
            </span>
          </div>
        </div>

        {isAiPhase && state.currentMessage && (
          <div className="rounded-2xl border border-mist bg-white p-4">
            <p className="mb-1 text-caption font-medium text-zinc-400">評価中</p>
            <p className="font-mono text-body-sm leading-relaxed text-midnight-ink break-all line-clamp-2">
              {state.currentMessage}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
