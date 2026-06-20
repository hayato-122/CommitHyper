"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ScrollReveal } from "@/components/ScrollReveal";
import {
  ArrowLeft,
  RotateCw,
  ArrowUpDown,
  LogOut,
} from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

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
  const router = useRouter();
  const pathname = usePathname();
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
      await Promise.all([loadAllCommits(), loadBranches(), loadProgress()]);
      if (!cancelled) setLoading(false);
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
      (c) => c.status === "pending" && c.currentScore < 70,
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
    await Promise.all([loadAllCommits(true), loadProgress()]);
    setRefreshing(false);
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-6">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 hover:opacity-80"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-teal">
              <img src="/icon1.png" alt="" className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-zinc-800">
              CommitHyper
            </span>
          </Link>
          <div className="h-4 w-px bg-zinc-200" />
          <Link
            href="/dashboard"
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600"
          >
            <ArrowLeft className="h-3 w-3" />
            リポジトリ一覧
          </Link>
          <div className="h-4 w-px bg-zinc-200" />
          <span className="text-sm font-medium text-zinc-600">
            {owner}/{name}
          </span>
          {branches.length > 0 && (
            <>
              <div className="h-4 w-px bg-zinc-200" />
              <select
                value={selectedBranch}
                onChange={(e) => handleBranchChange(e.target.value)}
                className="max-w-[140px] truncate rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-600 focus:outline-none focus:ring-1 focus:ring-brand-teal"
              >
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </>
          )}
          <div className="h-4 w-px bg-zinc-200" />
          <Link
            href="/guide"
            className="text-xs text-zinc-400 hover:text-zinc-600"
          >
            ガイド
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {progress && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 text-xs text-zinc-500 hover:text-midnight-ink">
                  {progress.avatarUrl && (
                    <img
                      src={progress.avatarUrl}
                      alt=""
                      className="h-6 w-6 rounded-full"
                    />
                  )}
                  {progress.name}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })} className="cursor-pointer gap-2">
                  <LogOut className="h-4 w-4" />
                  ログアウト
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

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
                    <div className="rounded-xl border border-zinc-200 bg-white p-5">
                      <div className="flex gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-xs text-zinc-400">
                            {commit.sha.slice(0, 7)}
                          </p>
                          <p className="mt-1 text-sm leading-relaxed text-zinc-800">
                            {commit.message}
                          </p>
                          <p className="mt-2 text-xs text-zinc-500">
                            {commit.authorName} ·{" "}
                            {new Date(commit.committedAt).toLocaleDateString(
                              "ja-JP",
                            )}
                          </p>
                          {commit.firstIssue && (
                            <p className="mt-2 text-xs text-red-600">
                              {commit.firstIssue}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end justify-between gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${commit.currentScore < 70 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
                          >
                            {commit.currentScore}/100
                          </span>
                          <button
                            onClick={() =>
                              router.push(
                                `/dashboard/${owner}/${name}/improve/${commit.id}`,
                              )
                            }
                            className="rounded-lg bg-brand-teal px-4 py-1.5 text-xs font-medium text-white hover:brightness-110"
                          >
                            改善する
                          </button>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                ))
              )}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-4">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-30"
                  >
                    ←
                  </button>
                  <span className="text-sm font-medium text-zinc-600">
                    {String(page).padStart(2, "0")} /{" "}
                    {String(totalPages).padStart(2, "0")}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-30"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === "all" && (
            <div className="space-y-3">
              {sortCommits(allCommits).map((commit) => (
                <ScrollReveal key={commit.id}>
                  <div className="rounded-xl border border-zinc-200 bg-white p-4">
                    <div className="flex gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs text-zinc-400">
                          {commit.sha.slice(0, 7)}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-zinc-800">
                          {commit.message}
                        </p>
                        <p className="mt-2 text-xs text-zinc-500">
                          {commit.authorName} ·{" "}
                          {new Date(commit.committedAt).toLocaleDateString(
                            "ja-JP",
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col items-end justify-between gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${commit.currentScore < 70 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
                        >
                          {commit.currentScore}/100
                        </span>
                        <button
                          onClick={() =>
                            router.push(
                              `/dashboard/${owner}/${name}/improve/${commit.id}`,
                            )
                          }
                          className="rounded-lg bg-brand-teal px-4 py-1.5 text-xs font-medium text-white hover:brightness-110"
                        >
                          改善する
                        </button>
                      </div>
                    </div>
                  </div>
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