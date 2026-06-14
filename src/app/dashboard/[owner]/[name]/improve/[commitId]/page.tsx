"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ScrollReveal } from "@/components/ScrollReveal";

type Evaluation = {
  score: number;
  rank: string;
  issues: string[];
  suggestions: string[];
  exampleMessage: string;
  passed: boolean;
  xpGained: number;
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
  const [result, setResult] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/repos/${owner}/${name}/commits`)
      .then((res) => res.json())
      .then((data) => {
        const found = (Array.isArray(data) ? data : []).find(
          (c: CommitData) => c.id === commitId
        );
        setCommit(found ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [owner, name, commitId]);

  async function handleReevaluate() {
    if (!improvedMessage.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/repos/${owner}/${name}/improve/${commitId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: improvedMessage }),
        }
      );
      const data = await res.json();
      setResult(data);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">読み込み中...</p>
      </div>
    );
  }

  if (!commit) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">コミットが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      {/* Back link */}
      <button
        onClick={() => router.back()}
        className="mb-6 text-sm text-zinc-500 hover:text-zinc-800"
      >
        ← ダッシュボードに戻る
      </button>

      <ScrollReveal>
        <h1 className="mb-2 text-2xl font-semibold">コミットメッセージを改善</h1>
        <p className="mb-8 text-sm text-zinc-500">
          {commit.sha.slice(0, 7)} · {commit.authorName} ·{" "}
          {new Date(commit.committedAt).toLocaleDateString("ja-JP")}
        </p>
      </ScrollReveal>

      {/* Original message */}
      <ScrollReveal>
        <div className="mb-8 rounded-xl border border-zinc-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-700">元のメッセージ</h2>
            <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600">
              {commit.currentScore}点
            </span>
          </div>
          <p className="font-mono text-sm text-zinc-800">{commit.message}</p>
        </div>
      </ScrollReveal>

      {/* Input area */}
      <ScrollReveal>
        <div className="mb-8">
          <label className="mb-2 block text-sm font-medium text-zinc-700">
            改善メッセージ
          </label>
          <textarea
            value={improvedMessage}
            onChange={(e) => setImprovedMessage(e.target.value)}
            placeholder="新しいコミットメッセージを入力..."
            rows={4}
            className="w-full rounded-xl border border-zinc-300 p-4 font-mono text-sm focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              例: `fix(auth): ログイン時のエラー処理を修正する`
            </span>
            <button
              onClick={handleReevaluate}
              disabled={submitting || !improvedMessage.trim()}
              className="rounded-lg bg-brand-teal px-6 py-2 text-sm font-medium text-white transition-all hover:brightness-110 disabled:opacity-50"
            >
              {submitting ? "評価中..." : "再評価する"}
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* Result */}
      {result && (
        <ScrollReveal>
          <div
            className={`rounded-xl border p-6 ${
              result.passed
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">評価結果</h2>
              <div className="text-right">
                <p
                  className={`text-3xl font-bold ${
                    result.passed ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {result.score}
                  <span className="text-sm font-normal text-zinc-500">
                    /100点
                  </span>
                </p>
                {result.xpGained > 0 && (
                  <p className="mt-1 text-sm font-medium text-zinc-600">
                    +{result.xpGained} XP
                  </p>
                )}
              </div>
            </div>

            <p className="mb-3 text-sm font-medium">
              {result.passed ? "✅ 合格！" : "💡 もう少し改善できます"}
            </p>

            {result.issues.length > 0 && (
              <div className="mb-3">
                <p className="mb-1 text-xs font-medium text-zinc-500">問題点</p>
                <ul className="space-y-1">
                  {result.issues.map((issue, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-zinc-700"
                    >
                      <span className="mt-0.5 shrink-0 text-red-400">•</span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.suggestions.length > 0 && (
              <div className="mb-3">
                <p className="mb-1 text-xs font-medium text-zinc-500">改善提案</p>
                <ul className="space-y-1">
                  {result.suggestions.map((s, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-zinc-700"
                    >
                      <span className="mt-0.5 shrink-0 text-amber-400">→</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-lg border border-zinc-200 bg-white p-3">
              <p className="mb-1 text-xs font-medium text-zinc-500">
                良いコミットメッセージ例
              </p>
              <p className="font-mono text-sm text-zinc-800">
                {result.exampleMessage}
              </p>
            </div>
          </div>
        </ScrollReveal>
      )}
    </div>
  );
}
