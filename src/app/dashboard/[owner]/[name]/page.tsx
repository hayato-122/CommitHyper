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

  useEffect(() => {
    fetch(`/api/repos/${owner}/${name}/commits`)
      .then((res) => res.json())
      .then((data) => {
        setCommits(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [owner, name]);

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
        <h1 className="mb-2 text-2xl font-semibold">
          {owner}/{name}
        </h1>
        <p className="mb-8 text-zinc-500">
          全{commits.length}件のコミット
        </p>
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
