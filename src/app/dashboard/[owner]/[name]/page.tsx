"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Header } from "@/components/Header";
import { CommitCard } from "@/components/CommitCard";
import { Pager } from "@/components/Pager";
import { SCORE } from "@/lib/evaluateCommit";
import {
  ArrowLeft,
  RotateCw,
  ArrowUpDown,
  Sparkles,
} from "lucide-react";

type AspectScores = {
  format: number;
  type: number;
  summary: number;
  why: number;
  readability: number;
  traceability: number;
};

type Commit = {
  id: string;
  sha: string;
  message: string;
  authorName: string;
  committedAt: string;
  initialScore: number;
  currentScore: number;
  status: string;
  firstIssue?: string | null;
  aspectScores?: AspectScores | null;
  exampleMessage?: string | null;
};

type Progress = {
  level: number;
  title: string;
  xp: number;
  nextLevel: number;
  nextTitle: string;
  progress: number;
  xpToNext: number;
  name: string;
  avatarUrl: string;
};

type AnalyzeState = {
  phase: "fetch" | "rule" | "ai";
  current: number;
  total: number;
  message: string;
  currentMessage?: string;
  score?: number;
  estimatedSecondsRemaining?: number;
  initialAvg?: number;
};

export default function DashboardPage() {
  const params = useParams();
  const owner = params.owner as string;
  const name = params.name as string;

  const [tab, setTab] = useState<"candidates" | "all">("candidates");
  const [allCommits, setAllCommits] = useState<Commit[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("default");
  const [sortBy, setSortBy] = useState<"score" | "date">("score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // SSE分析状態
  const [analyzeState, setAnalyzeState] = useState<AnalyzeState | null>(null);
  const evtSourceRef = useRef<EventSource | null>(null);

  const loadAllCommits = useCallback(
    async (forceRefresh = false, branch?: string) => {
      const params = new URLSearchParams();
      if (forceRefresh) params.set("refresh", "true");
      if (branch && branch !== "default") params.set("branch", branch);
      const qs = params.toString();
      const url = `/api/repos/${owner}/${name}/commits${qs ? `?${qs}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      setAllCommits(Array.isArray(data) ? data : []);
    },
    [owner, name],
  );

  const loadBranches = useCallback(async () => {
    const res = await fetch(`/api/repos/${owner}/${name}/branches`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setBranches(data);
        setSelectedBranch(data[0]);
      }
    }
  }, [owner, name]);

  const loadProgress = useCallback(async () => {
    const res = await fetch("/api/user/progress");
    if (res.ok) {
      const data = await res.json();
      setProgress(data);
    }
  }, []);

  // SSEで分析を開始
  const startAnalysis = useCallback((branch?: string) => {
    // 既存のSSE接続を閉じる
    if (evtSourceRef.current) {
      evtSourceRef.current.close();
    }

    const params = new URLSearchParams({ refresh: "true" });
    if (branch && branch !== "default") params.set("branch", branch);
    const url = `/api/repos/${owner}/${name}/commits?${params}`;

    setAnalyzeState({
      phase: "fetch",
      current: 0,
      total: 0,
      message: "GitHubからコミットを取得中...",
    });

    const evtSource = new EventSource(url);
    evtSourceRef.current = evtSource;

    evtSource.addEventListener("progress", (e) => {
      const data = JSON.parse(e.data);
      if (data.phase === "fetch_done") {
        setAnalyzeState((prev) => ({
          ...prev!,
          phase: "rule",
          current: 0,
          total: data.total,
          message: data.message,
        }));
      }
    });

    evtSource.addEventListener("phase", (e) => {
      const data = JSON.parse(e.data);
      setAnalyzeState((prev) => ({
        ...prev!,
        phase: data.name === "rule" ? "rule" : "ai",
        message: data.message,
      }));
    });

    evtSource.addEventListener("rule_complete", (e) => {
      const data = JSON.parse(e.data);
      setAllCommits(data.commits);
      setAnalyzeState((prev) => ({
        ...prev!,
        phase: "ai",
        current: 0,
        total: data.totalCount,
        message: "AIで詳細評価中...",
        estimatedSecondsRemaining: data.estimatedAiSeconds,
        initialAvg: data.initialAvg,
      }));
    });

    evtSource.addEventListener("ai_progress", (e) => {
      const data = JSON.parse(e.data);
      setAnalyzeState((prev) => ({
        ...prev!,
        current: data.current,
        total: data.total,
        currentMessage: data.currentMessage,
        score: data.score,
        estimatedSecondsRemaining: data.estimatedSecondsRemaining,
      }));
    });

    evtSource.addEventListener("ai_complete", (e) => {
      const data = JSON.parse(e.data);
      setAllCommits(data.commits);
      setAnalyzeState(null);
      setLoading(false);
      evtSource.close();
      evtSourceRef.current = null;
    });

    evtSource.addEventListener("error", () => {
      // エラー時は通常読み込みにフォールバック
      setAnalyzeState(null);
      setLoading(false);
      evtSource.close();
      evtSourceRef.current = null;
    });
  }, [owner, name]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);

      // 並行してブランチとプログレスを取得
      const [branchesRes, progressRes] = await Promise.all([
        fetch(`/api/repos/${owner}/${name}/branches`),
        fetch("/api/user/progress"),
      ]);

      if (branchesRes.ok) {
        const data = await branchesRes.json();
        if (Array.isArray(data) && data.length > 0) {
          setBranches(data);
          setSelectedBranch(data[0]);
        }
      }
      if (progressRes.ok) {
        const data = await progressRes.json();
        setProgress(data);
      }

      // 分析状態を確認
      const statusRes = await fetch(
        `/api/repos/${owner}/${name}/commits?status=true`,
      );
      const status = await statusRes.json();

      if (cancelled) return;

      if (status.analyzed) {
        // キャッシュあり → JSONでロード
        await loadAllCommits();
        setLoading(false);
      } else {
        // 初回 → SSEで分析
        startAnalysis();
      }
    }
    init();
    return () => {
      cancelled = true;
      if (evtSourceRef.current) {
        evtSourceRef.current.close();
        evtSourceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onTabChange(newTab: "candidates" | "all") {
    setTab(newTab);
    setPage(1);
    if (newTab === "all") loadAllCommits();
  }

  function sortCommits(list: Commit[]) {
    return [...list].sort((a, b) => {
      let cmp: number;
      if (sortBy === "score") {
        cmp = a.currentScore - b.currentScore;
      } else {
        cmp =
          new Date(a.committedAt).getTime() - new Date(b.committedAt).getTime();
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }

  function getCandidatePage() {
    const filtered = allCommits.filter(
      (c) => c.status === "pending" && c.currentScore < SCORE.GOOD,
    );
    const sorted = sortCommits(filtered);
    const perPage = 3;
    const totalPages = Math.ceil(sorted.length / perPage);
    const commits = sorted.slice((page - 1) * perPage, page * perPage);
    return { commits, totalPages, totalCount: sorted.length };
  }

  async function handleBranchChange(branch: string) {
    setSelectedBranch(branch);
    setPage(1);
    setLoading(true);
    await loadAllCommits(true, branch);
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    setPage(1);
    // SSEで再分析
    startAnalysis();
    await loadProgress();
    setRefreshing(false);
  }

  // ---------- 分析進捗画面 ----------
  if (analyzeState) {
    const total = analyzeState.total || 0;
    const current = analyzeState.current || 0;
    const percent = total > 0 ? Math.round((current / total) * 100) : 0;
    const isAiPhase = analyzeState.phase === "ai";
    const estimatedSec = analyzeState.estimatedSecondsRemaining ?? 0;
    const estimatedMin = Math.ceil(estimatedSec / 60);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-pearl px-6">
        <div className="w-full max-w-lg">
          {/* Title */}
          <div className="mb-10 text-center">
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-teal">
              <Sparkles className="h-7 w-7 text-white" />
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

          {/* Progress bar */}
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

          {/* Phase checklist */}
          <div className="mb-6 space-y-2">
            {/* Phase 1: Fetch */}
            <div className="flex items-center gap-3 rounded-xl border border-mist bg-white px-4 py-3">
              {analyzeState.phase === "fetch" ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-teal border-t-transparent" />
              ) : (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-teal text-[10px] text-white">✓</span>
              )}
              <span className={`text-body-sm ${analyzeState.phase === "fetch" ? "text-midnight-ink font-medium" : "text-zinc-500"}`}>
                GitHubからコミットを取得
                {analyzeState.phase !== "fetch" && `（${total}件）`}
              </span>
            </div>
            {/* Phase 2: Rule */}
            <div className="flex items-center gap-3 rounded-xl border border-mist bg-white px-4 py-3">
              {analyzeState.phase === "fetch" ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 text-[10px] text-zinc-400">—</span>
              ) : analyzeState.phase === "rule" ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-teal border-t-transparent" />
              ) : (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-teal text-[10px] text-white">✓</span>
              )}
              <span className={`text-body-sm ${analyzeState.phase === "rule" ? "text-midnight-ink font-medium" : analyzeState.phase === "fetch" ? "text-zinc-400" : "text-zinc-500"}`}>
                ルールベース評価
                {analyzeState.initialAvg != null && `（平均 ${analyzeState.initialAvg}点）`}
              </span>
            </div>
            {/* Phase 3: AI */}
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

          {/* Current commit being evaluated */}
          {isAiPhase && analyzeState.currentMessage && (
            <div className="rounded-2xl border border-mist bg-white p-4">
              <p className="mb-1 text-caption font-medium text-zinc-400">評価中</p>
              <p className="font-mono text-body-sm leading-relaxed text-midnight-ink break-all line-clamp-2">
                {analyzeState.currentMessage}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------- 通常のローディング ----------
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500">読み込み中...</p>
      </div>
    );
  }

  const {
    commits: candidateCommits,
    totalPages,
    totalCount,
  } = getCandidatePage();
  const totalCommits = allCommits.length;
  const initialAvg =
    totalCommits > 0
      ? Math.round(
          allCommits.reduce((s, c) => s + c.initialScore, 0) / totalCommits,
        )
      : 0;
  const currentAvg =
    totalCommits > 0
      ? Math.round(
          allCommits.reduce((s, c) => s + c.currentScore, 0) / totalCommits,
        )
      : 0;
  const improvedCount = allCommits.filter(
    (c) => c.status === "improved",
  ).length;
  const excellentCount = allCommits.filter(
    (c) => c.status === "excellent",
  ).length;

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        left={
          <>
            <div className="h-4 w-px bg-mist" />
            <Link
              href="/dashboard"
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600"
            >
              <ArrowLeft className="h-3 w-3" />
              リポジトリ一覧
            </Link>
            <div className="h-4 w-px bg-mist" />
            <span className="text-sm font-medium text-zinc-600">
              {owner}/{name}
            </span>
            {branches.length > 0 && (
              <>
                <div className="h-4 w-px bg-mist" />
                <select
                  value={selectedBranch}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  className="max-w-[140px] truncate rounded-lg border border-mist bg-white px-2 py-1 text-xs text-zinc-600 focus:outline-none focus:ring-1 focus:ring-brand-teal"
                >
                  {branches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </>
            )}
          </>
        }
        user={progress ? { name: progress.name, avatarUrl: progress.avatarUrl } : null}
      />

      <div className="flex flex-1">
        <main className="flex-1 px-8 py-10">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-midnight-ink">
              {owner}/{name}
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              コミットメッセージを分析・改善しましょう。
            </p>
          </div>

          <div className="mb-8 flex items-center justify-between">
            <div className="flex overflow-hidden rounded-lg border border-zinc-300">
              <button
                onClick={() => onTabChange("candidates")}
                className={`px-4 py-2 text-xs font-medium transition-all ${tab === "candidates" ? "bg-brand-teal text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"}`}
              >
                改善候補
              </button>
              <button
                onClick={() => onTabChange("all")}
                className={`px-4 py-2 text-xs font-medium transition-all ${tab === "all" ? "bg-brand-teal text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"}`}
              >
                すべてのコミット
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex overflow-hidden rounded-lg border border-zinc-300">
                <button
                  onClick={() => {
                    setSortBy("score");
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium transition-all ${sortBy === "score" ? "bg-brand-teal text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"}`}
                >
                  スコア
                </button>
                <button
                  onClick={() => {
                    setSortBy("date");
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium transition-all ${sortBy === "date" ? "bg-brand-teal text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"}`}
                >
                  日付
                </button>
              </div>
              <button
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50"
              >
                <ArrowUpDown className="mr-1 inline h-3 w-3" />
                {sortOrder === "asc" ? "昇順" : "降順"}
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
              >
                <RotateCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                再分析
              </button>
            </div>
          </div>

          {tab === "candidates" && (
            <div className="space-y-4">
              {candidateCommits.length === 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
                  <p className="text-lg font-medium text-zinc-700">
                    改善候補はありません
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    すべてのコミットメッセージが高評価です。
                  </p>
                </div>
              ) : (
                candidateCommits.map((commit) => (
                  <ScrollReveal key={commit.id}>
                    <CommitCard
                      sha={commit.sha}
                      message={commit.message}
                      authorName={commit.authorName}
                      committedAt={commit.committedAt}
                      score={commit.currentScore}
                      firstIssue={commit.firstIssue}
                      improveHref={`/dashboard/${owner}/${name}/improve/${commit.id}`}
                    />
                  </ScrollReveal>
                ))
              )}
              <Pager
                page={page}
                totalPages={totalPages}
                totalCount={totalCount}
                onPageChange={setPage}
              />
            </div>
          )}

          {tab === "all" && (
            <div className="space-y-3">
              {sortCommits(allCommits).map((commit) => (
                <ScrollReveal key={commit.id}>
                  <CommitCard
                    sha={commit.sha}
                    message={commit.message}
                    authorName={commit.authorName}
                    committedAt={commit.committedAt}
                    score={commit.currentScore}
                    improveHref={`/dashboard/${owner}/${name}/improve/${commit.id}`}
                    density="compact"
                  />
                </ScrollReveal>
              ))}
            </div>
          )}
        </main>

        <aside className="w-72 shrink-0 border-l border-zinc-200 bg-zinc-50 p-5">
          {progress && (
            <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-5">
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
                成長
              </h3>
              <p className="text-2xl font-bold text-zinc-800">
                Lv.{progress.level}
              </p>
              <p className="text-sm font-medium text-zinc-600">
                {progress.title}
              </p>
              <p className="mt-3 text-xs text-zinc-500">
                XP {progress.xp} / {progress.xp + progress.xpToNext}
              </p>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-brand-teal transition-all"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
              {progress.xpToNext > 0 && (
                <p className="mt-1 text-[10px] text-zinc-400">
                  あと{progress.xpToNext}XPでLv.{progress.nextLevel}
                </p>
              )}
            </div>
          )}
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
              リポジトリ品質
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">現在スコア</span>
                <span className="font-medium text-zinc-800">
                  {currentAvg} / 100
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">初期スコア</span>
                <span className="font-medium text-zinc-800">
                  {initialAvg} / 100
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">改善</span>
                <span
                  className={`font-medium ${currentAvg - initialAvg >= 0 ? "text-emerald-600" : "text-zinc-500"}`}
                >
                  {currentAvg - initialAvg >= 0 ? "+" : ""}
                  {currentAvg - initialAvg}
                </span>
              </div>
              <hr className="my-2 border-zinc-100" />
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">全コミット</span>
                <span className="font-medium text-zinc-800">
                  {totalCommits}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">改善必要</span>
                <span className="font-medium text-red-600">{totalCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">改善済み</span>
                <span className="font-medium text-emerald-600">
                  {improvedCount}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">優秀</span>
                <span className="font-medium text-zinc-800">
                  {excellentCount}
                </span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
