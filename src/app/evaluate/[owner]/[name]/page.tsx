"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { ScrollReveal } from "@/components/ScrollReveal";
import { CommitCard } from "@/components/CommitCard";
import { Pager } from "@/components/Pager";
import { SCORE } from "@/lib/evaluateCommit";
import { ArrowLeft, ArrowUpDown } from "lucide-react";

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

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/evaluate/${owner}/${name}/commits`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `エラー (${res.status})`);
      }
      const data: EvalCommit[] = await res.json();
      setAllCommits(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, name]);

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

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-pearl">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-brand-teal border-t-transparent" />
            <p className="text-body text-zinc-500">
              {owner}/{name} のコミットを分析中...
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-pearl">
        <Header />
        <main className="flex flex-1 items-center justify-center px-6">
          <div className="w-full max-w-md rounded-3xl border border-mist bg-white p-10 text-center shadow-subtle">
            <p className="text-heading-lg font-semibold text-zinc-300">!</p>
            <h1 className="mt-2 text-heading-sm font-semibold text-midnight-ink">
              読み込めませんでした
            </h1>
            <p className="mt-2 text-body text-zinc-500">{error}</p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button onClick={load} className="rounded-2xl border border-mist bg-white px-6 py-3 text-body-sm font-medium text-zinc-600 transition-all hover:bg-pearl">
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
              トップに戻る
            </Link>
            <div className="h-4 w-px bg-mist" />
            <span className="text-sm font-medium text-zinc-600">
              {owner}/{name}
            </span>
          </>
        }
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

        <aside className="w-72 shrink-0 border-l border-zinc-200 bg-zinc-50 p-5">
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
