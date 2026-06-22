"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ArrowLeft } from "lucide-react";

type EvalData = {
  score: number;
  rank: string;
  issues: string[];
  suggestions: string[];
  exampleMessage: string;
};

type CommitData = {
  id: string;
  sha: string;
  message: string;
  authorName: string;
  committedAt: string;
  currentScore: number;
};

export default function ImprovePage() {
  const params = useParams();
  const router = useRouter();
  const owner = params.owner as string;
  const name = params.name as string;
  const commitId = params.commitId as string;

  const [commit, setCommit] = useState<CommitData | null>(null);
  const [improvedMessage, setImprovedMessage] = useState("");
  // 表示中の評価データ（初回=元の評価, 再評価後=新しい結果に差し替え）
  const [activeEval, setActiveEval] = useState<EvalData | null>(null);
  // 再評価APIの結果（pendingApply, applied, xpGained等を含む）
  const [result, setResult] = useState<{
    score: number;
    issues: string[];
    suggestions: string[];
    exampleMessage: string;
    passed: boolean;
    xpGained: number;
    pendingApply?: boolean;
    applied?: boolean;
  } | null>(null);
  const [diff, setDiff] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [applying, setApplying] = useState(false);
  // 再評価済み（GitHub反映ボタン表示用）
  const [hasReevaluated, setHasReevaluated] = useState(false);
  // GitHub反映ガイドパネル表示
  const [showApplyGuide, setShowApplyGuide] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [commitsRes, evalRes] = await Promise.all([
        fetch(`/api/repos/${owner}/${name}/commits`),
        fetch(`/api/repos/${owner}/${name}/improve/${commitId}`),
      ]);
      const commitsData = await commitsRes.json();
      const found = (Array.isArray(commitsData) ? commitsData : []).find(
        (c: CommitData) => c.id === commitId
      );
      if (found?.sha) {
        const diffRes = await fetch(
          `/api/repos/${owner}/${name}/commits/${found.sha}/diff`
        );
        if (diffRes.ok) setDiff(await diffRes.text());
      }
      setCommit(found ?? null);
      if (evalRes.ok) setActiveEval(await evalRes.json());
      setLoading(false);
    }
    load();
  }, [owner, name, commitId]);

  // 再評価 — 評価のみ実行し、activeEvalを更新
  async function handleReevaluate() {
    if (!improvedMessage.trim()) return;
    setSubmitting(true);
    const res = await fetch(
      `/api/repos/${owner}/${name}/improve/${commitId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: improvedMessage }),
      }
    );
    const data = await res.json();
    setResult({ ...data, applied: false });
    // 評価結果カードの中身を差し替え
    setActiveEval({
      score: data.score,
      rank: data.rank,
      issues: data.issues,
      suggestions: data.suggestions,
      exampleMessage: data.exampleMessage,
    });
    setHasReevaluated(true);
    setShowApplyGuide(false);
    setSubmitting(false);
  }

  // GitHub反映ガイドパネルを開く
  function handleApply() {
    setShowApplyGuide(true);
  }

  // ガイドパネルで「修正完了」
  async function handleConfirmApply() {
    if (!improvedMessage.trim()) return;
    setApplying(true);
    const res = await fetch(
      `/api/repos/${owner}/${name}/improve/${commitId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: improvedMessage }),
      }
    );
    const data = await res.json();
    setResult({ ...data, applied: true });
    setShowApplyGuide(false);
    setApplying(false);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(improvedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pearl">
        <p className="text-body text-zinc-500">読み込み中...</p>
      </div>
    );
  }
  if (!commit) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pearl">
        <p className="text-body text-zinc-500">コミットが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-pearl">
      {/* ===== Top Bar ===== */}
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-mist bg-white px-6">
        <button
          onClick={() => router.push(`/dashboard/${owner}/${name}`)}
          className="flex items-center gap-1.5 text-body-sm text-zinc-500 transition-colors hover:text-midnight-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          ダッシュボードに戻る
        </button>
        <div className="h-4 w-px bg-mist" />
        <span className="text-body-sm text-zinc-500">
          {commit.sha.slice(0, 7)} · {commit.authorName}
        </span>
        <div className="h-4 w-px bg-mist" />
        <a
          href={`https://github.com/${owner}/${name}/commit/${commit.sha}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-body-sm font-medium text-brand-teal transition-opacity hover:opacity-80"
        >
          GitHubで見る ↗
        </a>
      </header>

      {/* ===== Body ===== */}
      <div className="flex flex-1 overflow-hidden">
        {/* ===== Left: Diff ===== */}
        <div className="flex w-1/2 flex-col border-r border-mist bg-white">
          <div className="flex h-10 shrink-0 items-center border-b border-mist px-5">
            <span className="text-caption font-medium text-zinc-500">diff</span>
          </div>
          {diff ? (
            <div className="flex-1 overflow-auto font-mono text-caption leading-relaxed">
              {diff.split("\n").map((line, i) => {
                if (line.startsWith("+") && !line.startsWith("+++")) {
                  return (
                    <div key={i} className="flex">
                      <span className="w-10 shrink-0 select-none bg-green-50 text-right pr-3 text-[10px] leading-5 text-green-400">
                        {i + 1}
                      </span>
                      <span className="flex-1 bg-green-50 px-3 text-green-800 break-all">
                        {line}
                      </span>
                    </div>
                  );
                }
                if (line.startsWith("-") && !line.startsWith("---")) {
                  return (
                    <div key={i} className="flex">
                      <span className="w-10 shrink-0 select-none bg-red-50 text-right pr-3 text-[10px] leading-5 text-red-400">
                        {i + 1}
                      </span>
                      <span className="flex-1 bg-red-50 px-3 text-red-800 break-all">
                        {line}
                      </span>
                    </div>
                  );
                }
                if (line.startsWith("@@")) {
                  return (
                    <div key={i} className="flex">
                      <span className="w-10 shrink-0 select-none bg-blue-50 text-right pr-3 text-[10px] leading-5 text-blue-300">
                        {i + 1}
                      </span>
                      <span className="flex-1 bg-blue-50 px-3 text-blue-600 font-semibold">
                        {line}
                      </span>
                    </div>
                  );
                }
                if (
                  line.startsWith("diff --git") ||
                  line.startsWith("---") ||
                  line.startsWith("+++")
                ) {
                  return (
                    <div key={i} className="flex bg-pearl/50">
                      <span className="w-10 shrink-0 select-none text-right pr-3 text-[10px] leading-5 text-zinc-300">
                        {i + 1}
                      </span>
                      <span className="flex-1 px-3 text-zinc-500 font-medium">
                        {line}
                      </span>
                    </div>
                  );
                }
                return (
                  <div key={i} className="flex">
                    <span className="w-10 shrink-0 select-none text-right pr-3 text-[10px] leading-5 text-zinc-300">
                      {i + 1}
                    </span>
                    <span className="flex-1 px-3 text-zinc-700">{line}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-caption text-zinc-400">diffを読み込めませんでした</p>
            </div>
          )}
        </div>

        {/* ===== Right: Reference + Input ===== */}
        <div className="flex w-1/2 flex-col bg-pearl">
          <div className="flex-1 overflow-y-auto p-6">
            {/* Original Message Card */}
            <ScrollReveal>
              <div className="mb-6 rounded-2xl border border-mist bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-body-sm font-semibold text-midnight-ink">
                    元のメッセージ
                  </h2>
                  <span className="rounded-full bg-red-100 px-3 py-1 text-caption font-semibold text-red-700">
                    {commit.currentScore}<span className="font-normal text-red-500">/100</span>
                  </span>
                </div>
                <p className="font-mono text-body-sm leading-relaxed text-midnight-ink">
                  {commit.message}
                </p>
              </div>
            </ScrollReveal>

            {/* Evaluation Card — activeEvalが再評価時に差し替わる */}
            {activeEval && !result?.applied && (
              <ScrollReveal>
                <div className="mb-6 rounded-2xl border border-mist bg-white p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-body-sm font-semibold text-midnight-ink">
                      評価結果
                      {hasReevaluated && (
                        <span className="ml-2 text-caption font-normal text-brand-teal">
                          （再評価）
                        </span>
                      )}
                    </h2>
                    <span className="text-heading-sm font-bold text-midnight-ink">
                      {activeEval.score}
                      <span className="text-body-sm font-normal text-zinc-500">/100</span>
                    </span>
                  </div>

                  {/* Issues */}
                  {activeEval.issues.length > 0 && (
                    <div className="mb-4">
                      <p className="mb-2 text-caption font-medium text-zinc-500">
                        問題点
                      </p>
                      <ul className="space-y-1.5">
                        {activeEval.issues.map((issue, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-body-sm text-zinc-600 leading-relaxed"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                            <span>{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggestions */}
                  {activeEval.suggestions.length > 0 && (
                    <div className="mb-4">
                      <p className="mb-2 text-caption font-medium text-zinc-500">
                        改善提案
                      </p>
                      <ul className="space-y-1.5">
                        {activeEval.suggestions.map((s, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-body-sm text-zinc-600 leading-relaxed"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-teal" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Good Example */}
                  <div className="rounded-xl border border-mist bg-snow p-4">
                    <p className="mb-1.5 text-caption font-medium text-zinc-500">
                      良いコミットメッセージ例
                    </p>
                    <p className="font-mono text-body-sm leading-relaxed text-midnight-ink">
                      {activeEval.exampleMessage}
                    </p>
                  </div>

                  {/* GitHub反映ボタン（再評価後のみ・ガイド非表示時） */}
                  {hasReevaluated && !showApplyGuide && (
                    <div className="mt-4 border-t border-mist pt-4">
                      <p className="mb-3 text-caption text-zinc-400">
                        メッセージに問題がなければ「GitHubに反映」から修正手順を確認できます。
                      </p>
                      <button
                        onClick={handleApply}
                        className="w-full rounded-xl bg-midnight-ink px-6 py-2.5 text-body-sm font-semibold text-white transition-all hover:brightness-110"
                      >
                        GitHubに反映する
                      </button>
                    </div>
                  )}

                  {/* GitHub反映ガイドパネル */}
                  {showApplyGuide && (
                    <div className="mt-4 border-t border-mist pt-4">
                      <h3 className="mb-3 text-body-sm font-semibold text-midnight-ink">
                        GitHubでコミットメッセージを修正
                      </h3>

                      {/* Step 1: コピー */}
                      <div className="mb-3 rounded-xl border border-brand-teal/30 bg-snow p-4">
                        <p className="mb-2 text-caption font-medium text-brand-teal">
                          Step 1 — 改善メッセージをコピー
                        </p>
                        <div className="rounded-lg border border-mist bg-white p-3 font-mono text-body-sm leading-relaxed text-midnight-ink break-all">
                          {improvedMessage}
                        </div>
                        <button
                          onClick={handleCopy}
                          className="mt-2 flex items-center gap-1.5 rounded-lg border border-mist bg-white px-3 py-1.5 text-caption font-medium text-zinc-600 transition-all hover:bg-pearl"
                        >
                          {copied ? "コピーしました ✓" : "クリップボードにコピー"}
                        </button>
                      </div>

                      {/* Step 2: GitHubでamend */}
                      <div className="mb-3 rounded-xl border border-mist bg-snow p-4">
                        <p className="mb-2 text-caption font-medium text-zinc-500">
                          Step 2 — ターミナルでコミットを修正
                        </p>
                        <ol className="mb-3 space-y-1 pl-5 text-body-sm text-zinc-600">
                          <li className="list-decimal">
                            リポジトリのディレクトリで以下を実行：
                            <code className="mx-1 rounded bg-pearl px-1.5 py-0.5 font-mono text-caption text-midnight-ink">
                              git commit --amend -m "新しいメッセージ"
                            </code>
                          </li>
                          <li className="list-decimal">
                            続けて：
                            <code className="mx-1 rounded bg-pearl px-1.5 py-0.5 font-mono text-caption text-midnight-ink">
                              git push --force
                            </code>
                          </li>
                        </ol>
                        <a
                          href={`https://github.com/${owner}/${name}/commit/${commit.sha}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-caption font-medium text-brand-teal hover:underline"
                        >
                          GitHubでコミットを確認する ↗
                        </a>
                      </div>

                      {/* Step 3: 完了 */}
                      <div className="rounded-xl border border-mist bg-snow p-4">
                        <p className="mb-2 text-caption font-medium text-zinc-500">
                          Step 3 — 修正完了
                        </p>
                        <p className="mb-3 text-caption text-zinc-400">
                          GitHub上のコミットメッセージを修正したら、このボタンでCommitHyperにスコアとXPを反映します。
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowApplyGuide(false)}
                            className="rounded-xl border border-mist bg-white px-5 py-2 text-body-sm font-medium text-zinc-500 transition-all hover:bg-pearl"
                          >
                            キャンセル
                          </button>
                          <button
                            onClick={handleConfirmApply}
                            disabled={applying}
                            className="flex-1 rounded-xl bg-brand-teal px-6 py-2.5 text-body-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
                          >
                            {applying ? "反映中..." : "修正完了 — スコアを反映する"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollReveal>
            )}

            {/* Applied Result */}
            {result?.applied && (
              <div className="mb-4">
                <ScrollReveal>
                  <div className="rounded-2xl border border-leaf-soft/50 bg-white p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-body-sm font-semibold text-midnight-ink">
                        反映完了
                      </h2>
                      <div className="text-right">
                        <span className="text-heading-sm font-bold text-leaf-soft">
                          {result.score}
                          <span className="text-body-sm font-normal text-zinc-500">
                            /100
                          </span>
                        </span>
                        {result.xpGained > 0 && (
                          <span className="ml-3 text-body-sm font-bold text-brand-teal">
                            +{result.xpGained} XP
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-body-sm font-semibold text-leaf-soft">
                      {result.passed
                        ? "改善を反映しました！"
                        : "改善を反映しました。"}
                    </p>
                    {result.xpGained > 0 && (
                      <p className="mt-2 text-body-sm text-zinc-500">
                        {result.xpGained} XPを獲得しました。
                      </p>
                    )}
                    <div className="mt-4 border-t border-mist pt-4">
                      <button
                        onClick={() =>
                          router.push(`/dashboard/${owner}/${name}`)
                        }
                        className="rounded-xl bg-brand-teal px-6 py-2.5 text-body-sm font-semibold text-white transition-all hover:brightness-110"
                      >
                        ダッシュボードに戻る
                      </button>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
            )}
          </div>

          {/* Input area — 反映済みなら非表示 */}
          {!result?.applied && (
            <div className="shrink-0 border-t border-mist bg-white p-6">
              <textarea
                value={improvedMessage}
                onChange={(e) => setImprovedMessage(e.target.value)}
                placeholder="新しいコミットメッセージを入力..."
                rows={4}
                className="w-full resize-none rounded-xl border border-mist bg-white px-4 py-3 font-mono text-body-sm text-midnight-ink placeholder:text-fog-gray focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
              />
              <div className="mt-4 flex items-center justify-between">
                <span className="text-caption text-zinc-500">
                  type(scope): 「何を」「なぜ」変えたか具体的に
                </span>
                <button
                  onClick={handleReevaluate}
                  disabled={submitting || !improvedMessage.trim()}
                  className="rounded-xl bg-brand-teal px-6 py-2.5 text-body-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100"
                >
                  {submitting ? "評価中..." : "再評価する"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
