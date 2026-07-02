"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Header } from "@/components/Header";
import { CommitCard } from "@/components/CommitCard";
import { Pager } from "@/components/Pager";
import { AnalyzeLoading } from "@/components/AnalyzeLoading";
import { useSSEAnalysis } from "@/hooks/useSSEAnalysis";
import { SCORE } from "@/lib/evaluateCommit";
import { exportMarkdown, downloadFile, type ExportCommit } from "@/lib/export";
import {
  ArrowLeft,
  RotateCw,
  ArrowUpDown,
  Download,
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
  const branchKey = `branch:${owner}/${name}`;
  const [selectedBranch, setSelectedBranch] = useState(() => {
    if (typeof window === "undefined") return "default";
    return localStorage.getItem(branchKey) || "default";
  });
  const [sortBy, setSortBy] = useState<"score" | "date">("score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const { analyzeState, startAnalysis } = useSSEAnalysis();

  function handleExportMd() {
    const ownerName = `${owner}/${name}`;
    const commits: ExportCommit[] = allCommits.map((c) => ({
      sha: c.sha,
      message: c.message,
      authorName: c.authorName,
      committedAt: c.committedAt,
      score: c.currentScore,
      initialScore: c.initialScore,
      status: c.status,
      firstIssue: c.firstIssue,
      aspectScores: c.aspectScores ?? null,
    }));
    const md = exportMarkdown(commits, ownerName);
    downloadFile(md, `${owner}-${name}-commits.md`);
  }

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

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);

      const [branchesRes, progressRes] = await Promise.all([
        fetch(`/api/repos/${owner}/${name}/branches`),
        fetch("/api/user/progress"),
      ]);

      let branchesData: string[] = [];
      if (branchesRes.ok) {
        const data = await branchesRes.json();
        if (Array.isArray(data) && data.length > 0) {
          branchesData = data;
          setBranches(data);
          setSelectedBranch(data[0]);
        }
      }
      if (progressRes.ok) {
        const data = await progressRes.json();
        setProgress(data);
      }

      const statusRes = await fetch(
        `/api/repos/${owner}/${name}/commits?status=true`,
      );
      const status = await statusRes.json();

      if (cancelled) return;

      if (status.analyzed) {
        await loadAllCommits();
        setLoading(false);
      } else {
        const initialBranch = Array.isArray(branchesData) && branchesData.length > 0 ? branchesData[0] : undefined;
        const params = new URLSearchParams({ refresh: "true" });
        if (initialBranch && initialBranch !== "default") params.set("branch", initialBranch);
        const url = `/api/repos/${owner}/${name}/commits?${params}`;
        startAnalysis(url, {
          onRuleComplete(data) {
            const d = data as { commits: Commit[] };
            setAllCommits(d.commits);
          },
          onAIComplete(data) {
            const d = data as { commits: Commit[] };
            setAllCommits(d.commits);
            setLoading(false);
          },
          onError() {
            setLoading(false);
          },
        });
      }
    }
    init();
    return () => {
      cancelled = true;
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
    const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
    const commits = sorted.slice((page - 1) * perPage, page * perPage);
    return { commits, totalPages, totalCount: sorted.length };
  }

  function getAllPage() {
    const sorted = sortCommits(allCommits);
    const perPage = 20;
    const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
    const commits = sorted.slice((page - 1) * perPage, page * perPage);
    return { commits, totalPages, totalCount: sorted.length };
  }

  async function handleBranchChange(branch: string) {
    setSelectedBranch(branch);
    localStorage.setItem(branchKey, branch);
    setPage(1);
    setLoading(true);
    await loadAllCommits(true, branch);
    setLoading(false);
  }

  async function handleRefresh() {
    setRefreshing(true);
    setPage(1);
    const params = new URLSearchParams({ refresh: "true" });
    const url = `/api/repos/${owner}/${name}/commits?${params}`;
    startAnalysis(url, {
      onRuleComplete(data) {
        const d = data as { commits: Commit[] };
        setAllCommits(d.commits);
      },
      onAIComplete(data) {
        const d = data as { commits: Commit[] };
        setAllCommits(d.commits);
        setRefreshing(false);
      },
      onError() {
        setRefreshing(false);
      },
    });
    await loadProgress();
  }

  if (analyzeState) {
    return <AnalyzeLoading owner={owner} name={name} state={analyzeState} />;
  }

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
  const allPage = getAllPage();
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
              <span className="hidden md:inline">リポジトリ一覧</span>
            </Link>
            <div className="hidden md:block h-4 w-px bg-mist" />
            <span className="text-sm font-medium text-zinc-600 truncate max-w-[100px] md:max-w-none">
              {owner}/{name}
            </span>
            {branches.length > 0 && (
              <>
                <div className="hidden md:block h-4 w-px bg-mist" />
                <select
                  value={selectedBranch}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  className="max-w-[80px] md:max-w-[140px] truncate rounded-lg border border-mist bg-white px-2 py-1 text-xs text-zinc-600 focus:outline-none focus:ring-1 focus:ring-brand-teal"
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

      <div className="flex flex-1 flex-col md:flex-row">
        <main className="flex flex-1 flex-col px-6 md:px-8 py-10">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold leading-tight tracking-tight text-midnight-ink">
              {owner}/{name}
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              コミットメッセージを分析・改善しましょう。
            </p>
          </div>

          <div className="mb-8 flex flex-wrap items-center justify-between gap-2">
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
                onClick={handleExportMd}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50"
              >
                <Download className="h-3.5 w-3.5" />
                Markdownで保存
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
            <>
              <div className="flex-1 space-y-4">
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
              </div>
              <Pager
                page={page}
                totalPages={totalPages}
                totalCount={totalCount}
                onPageChange={setPage}
              />
            </>
          )}

          {tab === "all" && (
            <>
              <div className="flex-1 space-y-3">
                {allCommits.length === 0 ? (
                  <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
                    <p className="text-lg font-medium text-zinc-700">コミットがありません</p>
                  </div>
                ) : (
                  allPage.commits.map((commit) => (
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
                  ))
                )}
              </div>
              <Pager
                page={page}
                totalPages={allPage.totalPages}
                totalCount={allPage.totalCount}
                onPageChange={setPage}
              />
            </>
          )}
        </main>

        <aside className="w-full md:w-72 md:shrink-0 border-t md:border-t-0 md:border-l border-zinc-200 bg-zinc-50 p-5">
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
