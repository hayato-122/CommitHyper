"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { ScrollReveal } from "@/components/ScrollReveal";
import { CommitCard } from "@/components/CommitCard";
import { Pager } from "@/components/Pager";
import { AnalyzeLoading } from "@/components/AnalyzeLoading";
import { useSSEAnalysis } from "@/hooks/useSSEAnalysis";
import { SCORE } from "@/lib/evaluateCommit";
import { exportMarkdown, downloadFile, type ExportCommit } from "@/lib/export";
import { ArrowLeft, ArrowUpDown, Download, AlertTriangle, RotateCw } from "lucide-react";

type AspectScores = {
  format: number;
  type: number;
  summary: number;
  why: number;
  readability: number;
  traceability: number;
};

type EvalCommit = {
  sha: string;
  message: string;
  authorName: string;
  committedAt: string;
  score: number;
  rank: string;
  issues: string[];
  suggestions: string[];
  exampleMessage: string;
  aspectScores?: AspectScores;
};

export default function EvaluatePage() {
  const params = useParams();
  const owner = params.owner as string;
  const name = params.name as string;

  const [allCommits, setAllCommits] = useState<EvalCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"candidates" | "all">("candidates");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"score" | "date">("score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [branches, setBranches] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("default");
  const [startable, setStartable] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { analyzeState, startAnalysis } = useSSEAnalysis();

  const loginLink = (
    <Link href="/login" className="rounded-2xl bg-brand-teal px-5 py-2.5 text-body-sm font-semibold text-white transition-all hover:brightness-110">
      ログイン
    </Link>
  );

  const LOCAL_CACHE_TTL = 24 * 60 * 60 * 1000;
  function cacheKey(branch: string) { return `evaluate:${owner}/${name}/${branch}`; }
  function loadLocalCache(branch: string): EvalCommit[] | null {
    try {
      const raw = localStorage.getItem(cacheKey(branch));
      if (!raw) return null;
      const { timestamp, commits } = JSON.parse(raw);
      if (Date.now() - timestamp > LOCAL_CACHE_TTL) {
        localStorage.removeItem(cacheKey(branch));
        return null;
      }
      return commits;
    } catch { return null; }
  }
  function saveLocalCache(branch: string, commits: EvalCommit[]) {
    try {
      localStorage.setItem(cacheKey(branch), JSON.stringify({ timestamp: Date.now(), commits }));
    } catch { /* localStorage full */ }
  }

  function handleExportMd() {
    const ownerName = `${owner}/${name}`;
    const commits: ExportCommit[] = allCommits.map((c) => ({
      sha: c.sha,
      message: c.message,
      authorName: c.authorName,
      committedAt: c.committedAt,
      score: c.score,
      firstIssue: c.issues[0],
      aspectScores: c.aspectScores ?? null,
    }));
    const md = exportMarkdown(commits, ownerName);
    downloadFile(md, `${owner}-${name}-commits.md`);
  }

  const init = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const branchesRes = await fetch(`/api/evaluate/${owner}/${name}/branches`);
      if (branchesRes.ok) {
        const data = await branchesRes.json();
        if (Array.isArray(data) && data.length > 0) {
          setBranches(data);
          setSelectedBranch(data[0]);
        }
      }
      setStartable(true);
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
      setLoading(false);
    }
  }, [owner, name]);

  useEffect(() => {
    init();
  }, [init]);

  async function handleStartAnalysis() {
    setStartable(false);
    setLoading(true);

    const localCache = loadLocalCache(selectedBranch);
    if (localCache) {
      setAllCommits(localCache);
      setLoading(false);
      return;
    }

    try {
      const qs = new URLSearchParams({ status: "true", branch: selectedBranch });
      const statusRes = await fetch(`/api/evaluate/${owner}/${name}/commits?${qs}`);
      if (statusRes.ok) {
        const status = await statusRes.json();
        if (status.cached) {
          const res = await fetch(`/api/evaluate/${owner}/${name}/commits?branch=${encodeURIComponent(selectedBranch)}`);
          if (res.ok) {
            const data: EvalCommit[] = await res.json();
            saveLocalCache(selectedBranch, data);
            setAllCommits(data);
            setLoading(false);
            return;
          }
        }
      }
    } catch { /* fall through to SSE */ }

    setLoading(false);
    const params = new URLSearchParams({ refresh: "true" });
    if (selectedBranch && selectedBranch !== "default") params.set("branch", selectedBranch);
    const url = `/api/evaluate/${owner}/${name}/commits?${params}`;
    startAnalysis(url, {
      onRuleComplete(data) {
        setAllCommits((data as { commits: EvalCommit[] }).commits);
      },
      onAIComplete(data) {
        const d = (data as { commits: EvalCommit[] }).commits;
        setAllCommits(d);
        saveLocalCache(selectedBranch, d);
      },
      onError() {
        setError("分析に失敗しました。もう一度お試しください。");
      },
    });
  }

  function handleRefresh() {
    setRefreshing(true);
    localStorage.removeItem(cacheKey(selectedBranch));
    const params = new URLSearchParams({ refresh: "true" });
    if (selectedBranch && selectedBranch !== "default") params.set("branch", selectedBranch);
    startAnalysis(`/api/evaluate/${owner}/${name}/commits?${params}`, {
      onRuleComplete(data) {
        setAllCommits((data as { commits: EvalCommit[] }).commits);
      },
      onAIComplete(data) {
        const d = (data as { commits: EvalCommit[] }).commits;
        setAllCommits(d);
        saveLocalCache(selectedBranch, d);
        setRefreshing(false);
      },
      onError() {
        setRefreshing(false);
      },
    });
  }

  function sortCommits(list: EvalCommit[]) {
    return [...list].sort((a, b) => {
      let cmp: number;
      if (sortBy === "score") {
        cmp = a.score - b.score;
      } else {
        cmp = new Date(a.committedAt).getTime() - new Date(b.committedAt).getTime();
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }

  function getCandidatePage() {
    const filtered = allCommits.filter((c) => c.score < SCORE.GOOD);
    const sorted = sortCommits(filtered);
    const perPage = 3;
    const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
    const commits = sorted.slice((page - 1) * perPage, page * perPage);
    return { commits, totalPages, totalCount: sorted.length };
  }

  const { commits: candidateCommits, totalPages, totalCount } = getCandidatePage();
  const totalCommits = allCommits.length;
  const currentAvg = totalCommits > 0
    ? Math.round(allCommits.reduce((s, c) => s + c.score, 0) / totalCommits)
    : 0;
  const needsImprovement = allCommits.filter((c) => c.score < SCORE.GOOD).length;
  const excellentCount = allCommits.filter((c) => c.score >= SCORE.GOOD).length;

  if (analyzeState) {
    return <AnalyzeLoading owner={owner} name={name} state={analyzeState} />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-pearl">
        <Header right={loginLink} />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-brand-teal border-t-transparent" />
            <p className="text-body text-zinc-500">
              {owner}/{name} の情報を読み込み中...
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (startable) {
    return (
      <div className="flex min-h-screen flex-col bg-pearl">
        <Header
          left={
            <>
              <div className="h-4 w-px bg-mist" />
              <Link href="/" className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600">
                <ArrowLeft className="h-3 w-3" />
                <span className="hidden md:inline">トップに戻る</span>
              </Link>
              <div className="hidden md:block h-4 w-px bg-mist" />
              <span className="text-sm font-medium text-zinc-600 truncate max-w-[120px] md:max-w-none">
                {owner}/{name}
              </span>
            </>
          }
          right={loginLink}
        />
        <main className="flex flex-1 items-center justify-center px-6">
          <div className="w-full max-w-md rounded-3xl border border-mist bg-white p-10 text-center shadow-subtle">
            <h1 className="text-heading-sm font-semibold text-midnight-ink">
              {owner}/{name}
            </h1>
            <p className="mt-2 text-body-sm text-zinc-500">
              分析するブランチを選択してください。
            </p>
            <div className="mt-6">
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full rounded-xl border border-mist bg-white px-4 py-3 text-body-sm text-zinc-700 focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
              >
                {branches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleStartAnalysis}
              className="mt-6 w-full rounded-2xl bg-brand-teal px-6 py-3 text-body-sm font-semibold text-white transition-all hover:brightness-110"
            >
              分析を開始する
            </button>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              未ログインのため最大200件まで表示されます
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-pearl">
        <Header right={loginLink} />
        <main className="flex flex-1 items-center justify-center px-6">
          <div className="w-full max-w-md rounded-3xl border border-mist bg-white p-10 text-center shadow-subtle">
            <p className="text-heading-lg font-semibold text-zinc-300">!</p>
            <h1 className="mt-2 text-heading-sm font-semibold text-midnight-ink">
              読み込めませんでした
            </h1>
            <p className="mt-2 text-body text-zinc-500">{error}</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button onClick={init} className="rounded-2xl border border-mist bg-white px-6 py-3 text-body-sm font-medium text-zinc-600 transition-all hover:bg-pearl">
                再試行
              </button>
              <Link href="/" className="rounded-2xl bg-brand-teal px-6 py-3 text-body-sm font-semibold text-white transition-all hover:brightness-110">
                トップに戻る
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        left={
          <>
            <div className="h-4 w-px bg-mist" />
            <Link href="/" className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600">
              <ArrowLeft className="h-3 w-3" />
              <span className="hidden md:inline">トップに戻る</span>
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
                  onChange={(e) => { setSelectedBranch(e.target.value); setAllCommits([]); setStartable(true); }}
                  className="max-w-[80px] md:max-w-[140px] truncate rounded-lg border border-mist bg-white px-2 py-1 text-xs text-zinc-600 focus:outline-none focus:ring-1 focus:ring-brand-teal"
                >
                  {branches.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </>
            )}
          </>
        }
        right={loginLink}
      />

      <div className="flex flex-1 flex-col md:flex-row">
        <main className="flex-1 px-6 md:px-8 py-10">
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
                onClick={() => { setTab("candidates"); setPage(1); }}
                className={`px-4 py-2 text-xs font-medium transition-all ${tab === "candidates" ? "bg-brand-teal text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"}`}
              >
                改善候補
              </button>
              <button
                onClick={() => { setTab("all"); setPage(1); }}
                className={`px-4 py-2 text-xs font-medium transition-all ${tab === "all" ? "bg-brand-teal text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"}`}
              >
                すべてのコミット
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex overflow-hidden rounded-lg border border-zinc-300">
                <button
                  onClick={() => { setSortBy("score"); setPage(1); }}
                  className={`px-3 py-1.5 text-xs font-medium transition-all ${sortBy === "score" ? "bg-brand-teal text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"}`}
                >
                  スコア
                </button>
                <button
                  onClick={() => { setSortBy("date"); setPage(1); }}
                  className={`px-3 py-1.5 text-xs font-medium transition-all ${sortBy === "date" ? "bg-brand-teal text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"}`}
                >
                  日付
                </button>
              </div>
              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
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
                className="flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
              >
                <RotateCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                再分析
              </button>
            </div>
          </div>

          {tab === "candidates" && (
            <div className="space-y-4">
              {candidateCommits.length === 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
                  <p className="text-lg font-medium text-zinc-700">改善候補はありません</p>
                  <p className="mt-2 text-sm text-zinc-500">すべてのコミットメッセージが高評価です。</p>
                </div>
              ) : (
                candidateCommits.map((commit) => (
                  <ScrollReveal key={commit.sha}>
                    <CommitCard
                      sha={commit.sha}
                      message={commit.message}
                      authorName={commit.authorName}
                      committedAt={commit.committedAt}
                      score={commit.score}
                      firstIssue={commit.issues[0]}
                      improveHref={`/evaluate/${owner}/${name}/improve?sha=${commit.sha}&message=${encodeURIComponent(commit.message)}&score=${commit.score}`}
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
                <ScrollReveal key={commit.sha}>
                  <CommitCard
                    sha={commit.sha}
                    message={commit.message}
                    authorName={commit.authorName}
                    committedAt={commit.committedAt}
                    score={commit.score}
                    improveHref={`/evaluate/${owner}/${name}/improve?sha=${commit.sha}&message=${encodeURIComponent(commit.message)}&score=${commit.score}`}
                    density="compact"
                  />
                </ScrollReveal>
              ))}
            </div>
          )}
        </main>

        <aside className="w-full md:w-72 md:shrink-0 border-t md:border-t-0 md:border-l border-zinc-200 bg-zinc-50 p-5">
          <div className="rounded-xl border border-zinc-200 bg-white p-5">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500">
              リポジトリ品質
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">平均スコア</span>
                <span className="font-medium text-zinc-800">{currentAvg} / 100</span>
              </div>
              <hr className="my-2 border-zinc-100" />
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">全コミット</span>
                <span className="font-medium text-zinc-800">{totalCommits}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">改善必要</span>
                <span className="font-medium text-red-600">{needsImprovement}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">良好</span>
                <span className="font-medium text-emerald-600">{excellentCount}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-5 text-center">
            <p className="text-xs text-zinc-400">
              未ログインのため最大200件まで表示されます。
              <br />
              ログインすると自分のリポジトリで
              <br />
              XPや成長ゲージが使えます
            </p>
            <Link
              href="/login"
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-brand-teal px-4 py-2 text-xs font-semibold text-white hover:brightness-110"
            >
              GitHubでログイン
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
