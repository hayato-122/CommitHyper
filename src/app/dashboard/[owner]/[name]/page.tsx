"use client";

import { useEffect, useState } from "react";
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

export default function CommitPage() {
  const params = useParams();
  const owner = params.owner as string;
  const name = params.name as string;

  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadCommits(forceRefresh = false) {
    const url = forceRefresh
      ? `/api/repos/${owner}/${name}/commits?refresh=true`
      : `/api/repos/${owner}/${name}/commits`;
    const res = await fetch(url);
    const data = await res.json();
    setCommits(Array.isArray(data) ? data : []);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadCommits();
  }, [owner, name]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadCommits(true);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">コミットを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <ScrollReveal>
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">
              {owner}/{name}
            </h1>
            <p className="mt-2 text-zinc-500">
              全{commits.length}件のコミット
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="shrink-0 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-all hover:bg-zinc-50 disabled:opacity-50"
          >
            {refreshing ? "再読み込み中..." : "再読み込み"}
          </button>
        </div>
      </ScrollReveal>

      <div className="space-y-3">
        {commits.map((commit) => (
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
    </div>
  );
}
