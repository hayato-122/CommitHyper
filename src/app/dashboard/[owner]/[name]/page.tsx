"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ScrollReveal } from "@/components/ScrollReveal";

type Commit = {
  id: string;
  sha: string;
  message: string;
  authorName: string;
  committedAt: string;
  initialScore: number;
  currentScore: number;
  status: string;
};

type CandidatesResponse = {
  commits: Commit[];
  page: number;
  totalPages: number;
  totalCount: number;
};

export default function DashboardPage() {
  const params = useParams();
  const owner = params.owner as string;
  const name = params.name as string;

  const [tab, setTab] = useState<"candidates" | "all">("candidates");
  const [candidates, setCandidates] = useState<CandidatesResponse | null>(null);
  const [allCommits, setAllCommits] = useState<Commit[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCandidates = useCallback(
    async (currentPage: number) => {
      const res = await fetch(
        `/api/repos/${owner}/${name}/candidates?page=${currentPage}`
      );
      const data = await res.json();
      setCandidates(data);
    },
    [owner, name]
  );

  const loadAllCommits = useCallback(
    async (forceRefresh = false) => {
      const url = forceRefresh
        ? `/api/repos/${owner}/${name}/commits?refresh=true`
        : `/api/repos/${owner}/${name}/commits`;
      const res = await fetch(url);
      const data = await res.json();
      setAllCommits(Array.isArray(data) ? data : []);
    },
    [owner, name]
  );

  // Initial load only - マウント時のみ発火
  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      if (tab === "candidates") {
        await Promise.all([loadCandidates(1), loadAllCommits()]);
      } else {
        await loadAllCommits();
      }
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
    setLoading(true);
    setPage(1);
    if (newTab === "candidates") {
      Promise.all([loadCandidates(1), loadAllCommits()]).then(() =>
        setLoading(false)
      );
    } else {
      loadAllCommits().then(() => setLoading(false));
    }
  }

  function onPageChange(newPage: number) {
    if (newPage < 1 || (candidates && newPage > candidates.totalPages)) return;
    setPage(newPage);
    loadCandidates(newPage);
  }

  async function handleRefresh() {
    setRefreshing(true);
    setPage(1);
    await loadAllCommits(true);
    await loadCandidates(1);
    setRefreshing(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {owner}/{name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {candidates?.totalCount ?? 0}件の改善候補
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-50 disabled:opacity-50"
        >
          {refreshing ? "再読み込み中..." : "再読み込み"}
        </button>
      </div>

      {/* Tab navigation */}
      <div className="mb-6 flex gap-1 rounded-lg bg-zinc-100 p-1">
        <button
          onClick={() => onTabChange("candidates")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            tab === "candidates"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          改善候補
        </button>
        <button
          onClick={() => onTabChange("all")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
            tab === "all"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          すべてのコミット
        </button>
      </div>

      {/* All commits tab */}
      {tab === "all" && (
        <div className="space-y-3">
          {allCommits.map((commit) => (
            <ScrollReveal key={commit.id}>
              <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-zinc-400">
                      {commit.sha.slice(0, 7)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-800">
                      {commit.message}
                    </p>
                    <p className="mt-2 text-xs text-zinc-500">
                      {commit.authorName} ·{" "}
                      {new Date(commit.committedAt).toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      commit.status === "pending"
                        ? "bg-amber-50 text-amber-700"
                        : commit.status === "excellent"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {commit.currentScore}
                  </span>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      )}

      {/* Candidates tab */}
      {tab === "candidates" && candidates && (
        <div className="space-y-4">
          {candidates.commits.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
              <p className="text-lg font-medium text-zinc-700">
                改善候補はありません
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                すべてのコミットメッセージが高評価です！
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                {candidates.commits.map((commit) => (
                  <ScrollReveal key={commit.id}>
                    <div className="rounded-xl border border-zinc-200 bg-white p-5">
                      <div className="mb-3 flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-zinc-400">
                              {commit.sha.slice(0, 7)}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                commit.currentScore >= 50
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-red-50 text-red-600"
                              }`}
                            >
                              {commit.currentScore}点
                            </span>
                          </div>
                          <p className="mt-2 font-mono text-sm text-zinc-800">
                            {commit.message}
                          </p>
                          <p className="mt-2 text-xs text-zinc-500">
                            {commit.authorName} ·{" "}
                            {new Date(commit.committedAt).toLocaleDateString(
                              "ja-JP"
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 border-t border-zinc-100 pt-3">
                        <button
                          onClick={() =>
                            (window.location.href = `/dashboard/${owner}/${name}/improve/${commit.id}`)
                          }
                          className="w-full rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white transition-all hover:brightness-110"
                        >
                          このコミットを改善する
                        </button>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>

              {/* Pager */}
              {candidates.totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-4">
                  <button
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 transition-all hover:bg-zinc-50 disabled:opacity-30"
                  >
                    前へ
                  </button>
                  <span className="text-sm font-medium text-zinc-600">
                    {String(page).padStart(2, "0")} /{" "}
                    {String(candidates.totalPages).padStart(2, "0")}
                  </span>
                  <button
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= candidates.totalPages}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-600 transition-all hover:bg-zinc-50 disabled:opacity-30"
                  >
                    次へ
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
