"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Header } from "@/components/Header";
import { DiffViewer } from "@/components/DiffViewer";
import { EvaluationCard } from "@/components/EvaluationCard";
import { ArrowLeft, Eye, EyeOff, GripVertical } from "lucide-react";

type AspectScores = {
  format: number;
  type: number;
  summary: number;
  why: number;
  readability: number;
  traceability: number;
};

type EvalData = {
  score: number;
  rank: string;
  issues: string[];
  suggestions: string[];
  exampleMessage: string;
  aspectScores?: AspectScores;
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
  const [showDiff, setShowDiff] = useState(false);
  const [ratio, setRatio] = useState(0.5);
  const [vertRatio, setVertRatio] = useState(0.65);
  const splitRef = useRef<HTMLDivElement | null>(null);
  const vertSplitRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef(false);
  const vertDragRef = useRef(false);

  function handleSplitDragStart() {
    dragRef.current = true;
  }

  function handleVertDragStart() {
    vertDragRef.current = true;
  }

  useEffect(() => {
    let rafId: number | null = null;

    function onMove(e: MouseEvent) {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (dragRef.current && splitRef.current) {
          const rect = splitRef.current.getBoundingClientRect();
          setRatio(Math.max(0.2, Math.min(0.8, (e.clientX - rect.left) / rect.width)));
        }
        if (vertDragRef.current && vertSplitRef.current) {
          const rect = vertSplitRef.current.getBoundingClientRect();
          setVertRatio(Math.max(0.3, Math.min(0.85, (e.clientY - rect.top) / rect.height)));
        }
      });
    }

    function onUp() {
      if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
      dragRef.current = false;
      vertDragRef.current = false;
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [commitsRes, evalRes] = await Promise.all([
        fetch(`/api/repos/${owner}/${name}/commits`),
        fetch(`/api/repos/${owner}/${name}/improve/${commitId}`),
      ]);
      if (cancelled) return;
      const commitsData = await commitsRes.json();
      const found = (Array.isArray(commitsData) ? commitsData : []).find(
        (c: CommitData) => c.id === commitId
      );
      if (found?.sha) {
        const diffRes = await fetch(
          `/api/repos/${owner}/${name}/commits/${found.sha}/diff`
        );
        if (diffRes.ok && !cancelled) setDiff(await diffRes.text());
      }
      if (cancelled) return;
      setCommit(found ?? null);
      if (evalRes.ok) setActiveEval(await evalRes.json());
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
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
      aspectScores: data.aspectScores,
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
      <Header
        left={
          <>
            <div className="h-4 w-px bg-mist" />
            <button
              onClick={() => router.push(`/dashboard/${owner}/${name}`)}
              className="flex items-center gap-1.5 text-body-sm text-zinc-500 transition-colors hover:text-midnight-ink"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden md:inline">ダッシュボードに戻る</span>
            </button>
            <div className="hidden md:block h-4 w-px bg-mist" />
            <span className="text-body-sm text-zinc-500 truncate max-w-[100px] md:max-w-none">
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
          </>
        }
      />

      {/* ===== Body ===== */}
      {/* Mobile: stacked layout  /  Desktop: SplitPane with drag */}
      <div className="flex flex-1 flex-col overflow-hidden md:hidden">
        {/* Mobile: Diff toggle */}
        <div className="flex flex-col border-b border-mist bg-white">
          <button
            onClick={() => setShowDiff(!showDiff)}
            className="flex h-10 shrink-0 items-center gap-2 border-b border-mist px-5 text-caption font-medium text-zinc-500 hover:bg-pearl"
          >
            <span>diff</span>
            <span className="ml-auto flex items-center gap-1">
              <span className="text-[11px] text-zinc-400">{showDiff ? "非表示" : "表示"}</span>
              {showDiff ? <EyeOff className="h-3.5 w-3.5 text-zinc-400" /> : <Eye className="h-3.5 w-3.5 text-zinc-400" />}
            </span>
          </button>
          <div className={`${showDiff ? "flex" : "hidden"} flex-1`}>
            {diff ? <DiffViewer diff={diff} /> : (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-caption text-zinc-400">diffを読み込めませんでした</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop: SplitPane with drag */}
      <div ref={splitRef} className="hidden md:flex flex-1 overflow-hidden select-none">
        {/* Left: Diff */}
        <div className="flex flex-col overflow-hidden border-r border-mist bg-white" style={{ width: `${ratio * 100}%`, minWidth: "20%" }}>
          <div className="flex h-10 shrink-0 items-center border-b border-mist px-5">
            <span className="text-caption font-medium text-zinc-500">diff</span>
          </div>
          {diff ? <DiffViewer diff={diff} /> : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-caption text-zinc-400">diffを読み込めませんでした</p>
            </div>
          )}
        </div>
        {/* Divider */}
        <div
          className="flex shrink-0 cursor-col-resize items-center justify-center bg-transparent hover:bg-mist/50 transition-colors"
          style={{ width: 12 }}
          onMouseDown={(e) => { e.preventDefault(); handleSplitDragStart(); }}
        >
          <div className="flex h-10 items-center justify-center rounded-full bg-mist/80">
            <GripVertical className="h-3.5 w-3.5 text-zinc-400" />
          </div>
        </div>
        {/* Right */}
        <div ref={vertSplitRef} className="flex flex-1 flex-col overflow-hidden min-w-0 bg-pearl">
          <div className="overflow-y-auto p-4 md:p-6" style={{ height: `${vertRatio * 100}%` }}>
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
                <EvaluationCard
                  score={activeEval.score}
                  issues={activeEval.issues}
                  suggestions={activeEval.suggestions}
                  exampleMessage={activeEval.exampleMessage}
                  label={hasReevaluated ? "評価結果（再評価）" : "評価結果"}
                  aspectScores={activeEval.aspectScores}
                />
                {/* GitHub反映ボタン（再評価後のみ） */}
                {hasReevaluated && (
                <div className="mt-4 border-t border-mist pt-4">
                  {!showApplyGuide ? (
                    <>
                      <p className="mb-3 text-caption text-zinc-400">
                        メッセージに問題がなければ「GitHubに反映」から修正手順を確認できます。
                      </p>
                      <button
                        onClick={handleApply}
                        className="w-full rounded-xl bg-midnight-ink px-6 py-2.5 text-body-sm font-semibold text-white transition-all hover:brightness-110"
                      >
                        GitHubに反映する
                      </button>
                    </>
                  ) : (
                    <>
                      <h3 className="mb-3 text-body-sm font-semibold text-midnight-ink">
                        GitHubでコミットメッセージを修正
                      </h3>
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
                      <div className="mb-3 rounded-xl border border-mist bg-snow p-4">
                        <p className="mb-2 text-caption font-medium text-zinc-500">
                          Step 2 — ターミナルでコミットを修正
                        </p>
                        <ol className="mb-3 space-y-1 pl-5 text-body-sm text-zinc-600">
                          <li className="list-decimal">
                            リポジトリのディレクトリで以下を実行：
                            <code className="mx-1 rounded bg-pearl px-1.5 py-0.5 font-mono text-caption text-midnight-ink">
                              {`git commit --amend -m "新しいメッセージ"`}
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
                    </>
                  )}
                </div>
                )}
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

          {/* Vertical divider */}
          <div
            className="shrink-0 cursor-row-resize bg-transparent hover:bg-mist/50 transition-colors flex items-center justify-center"
            style={{ height: 8 }}
            onMouseDown={(e) => { e.preventDefault(); handleVertDragStart(); }}
          >
            <div className="flex w-10 items-center justify-center rounded-full bg-mist/80">
              <GripVertical className="h-3 w-3 text-zinc-400 rotate-90" />
            </div>
          </div>

          {/* Input area — 反映済みなら非表示 */}
          {!result?.applied && (
            <div className="flex flex-1 flex-col overflow-hidden border-t border-mist bg-white">
              <div className="flex-1 p-4 md:p-6 pb-2 flex flex-col">
                <textarea
                  value={improvedMessage}
                  onChange={(e) => setImprovedMessage(e.target.value)}
                  placeholder="新しいコミットメッセージを入力..."
                  className="flex-1 resize-none rounded-xl border border-mist bg-white px-4 py-3 font-mono text-body-sm text-midnight-ink placeholder:text-fog-gray focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20 min-h-[60px]"
                />
              </div>
              <div className="shrink-0 flex items-center justify-between px-4 md:px-6 pb-4 md:pb-6">
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
