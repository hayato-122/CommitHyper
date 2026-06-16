"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ArrowLeft } from "lucide-react";

type OriginalEval = {
  score: number;
  rank: string;
  issues: string[];
  suggestions: string[];
  exampleMessage: string;
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
  const [result, setResult] = useState<{ score: number; issues: string[]; suggestions: string[]; exampleMessage: string; passed: boolean; xpGained: number } | null>(null);
  const [originalEval, setOriginalEval] = useState<OriginalEval | null>(null);
  const [diff, setDiff] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [commitsRes, evalRes] = await Promise.all([
        fetch(`/api/repos/${owner}/${name}/commits`),
        fetch(`/api/repos/${owner}/${name}/improve/${commitId}`),
      ]);
      const commitsData = await commitsRes.json();
      const found = (Array.isArray(commitsData) ? commitsData : []).find(
        (c: CommitData) => c.id === commitId
      );
      if (found && found.sha) {
        const diffRes = await fetch(`/api/repos/${owner}/${name}/commits/${found.sha}/diff`);
        if (diffRes.ok) {
          if (!cancelled) setDiff(await diffRes.text());
        }
      }
      if (!cancelled) {
        setCommit(found ?? null);
        if (evalRes.ok) {
          const evalData = await evalRes.json();
          setOriginalEval(evalData);
        }
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [owner, name, commitId]);

  async function handleReevaluate() {
    if (!improvedMessage.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/repos/${owner}/${name}/improve/${commitId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: improvedMessage }),
      });
      const data = await res.json();
      setResult(data);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-zinc-500">読み込み中...</p></div>;
  }
  if (!commit) {
    return <div className="flex min-h-screen items-center justify-center"><p className="text-zinc-500">コミットが見つかりません</p></div>;
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-50">
      {/* ===== Top Bar ===== */}
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-zinc-200 bg-white px-6">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800">
          <ArrowLeft className="h-4 w-4" />
          戻る
        </button>
        <div className="h-4 w-px bg-zinc-200" />
        <span className="text-sm text-zinc-500">{commit.sha.slice(0, 7)} · {commit.authorName}</span>
        <div className="h-4 w-px bg-zinc-200" />
        <a href={`https://github.com/${owner}/${name}/commit/${commit.sha}`} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-teal hover:underline">GitHub ↗</a>
      </header>

      {/* ===== Body ===== */}
      <div className="flex flex-1 overflow-hidden">
        {/* ===== Left: Diff ===== */}
        <div className="flex w-1/2 flex-col border-r border-zinc-200 bg-white">
          <div className="flex h-10 shrink-0 items-center border-b border-zinc-100 px-5">
            <span className="text-xs font-medium text-zinc-500">diff</span>
          </div>
          {diff ? (
            <pre className="flex-1 overflow-auto p-5 text-xs leading-relaxed text-zinc-700 whitespace-pre-wrap font-mono">
              {diff}
            </pre>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-xs text-zinc-400">diffを読み込めませんでした</p>
            </div>
          )}
        </div>

        {/* ===== Right: Reference + Input ===== */}
        <div className="flex w-1/2 flex-col">
          {/* Original message + Evaluation — scrollable reference */}
          <div className="flex-1 overflow-y-auto p-5 pb-2">
            <ScrollReveal>
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-xs font-medium text-zinc-500">元のメッセージ</h2>
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">{commit.currentScore}点</span>
                </div>
                <p className="rounded-lg bg-zinc-50 p-3 font-mono text-sm text-zinc-800">{commit.message}</p>
              </div>
            </ScrollReveal>

            {originalEval && (
              <ScrollReveal>
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                  <h2 className="mb-2 text-xs font-medium text-zinc-500">評価結果</h2>
                  {originalEval.issues.length > 0 && (
                    <div className="mb-2">
                      <ul className="space-y-1">
                        {originalEval.issues.map((issue, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-zinc-700">
                            <span className="mt-0.5 shrink-0 text-red-400">•</span>
                            <span>{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {originalEval.suggestions.length > 0 && (
                    <div className="mb-2">
                      <ul className="space-y-1">
                        {originalEval.suggestions.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-zinc-700">
                            <span className="mt-0.5 shrink-0 text-amber-500">→</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="rounded-lg border border-zinc-200 bg-white p-2.5">
                    <p className="mb-0.5 text-[10px] font-medium text-zinc-500">良いコミットメッセージ例</p>
                    <p className="font-mono text-xs text-zinc-800">{originalEval.exampleMessage}</p>
                  </div>
                </div>
              </ScrollReveal>
            )}

            {result && (
              <div className="mb-4">
                <ScrollReveal>
                  <div className={`rounded-lg border p-4 ${result.passed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                    <div className="mb-2 flex items-center justify-between">
                      <h2 className="text-xs font-medium text-zinc-500">再評価結果</h2>
                      <div className="text-right">
                        <span className={`text-xl font-bold ${result.passed ? "text-emerald-600" : "text-amber-600"}`}>
                          {result.score}<span className="text-xs font-normal text-zinc-400">/100</span>
                        </span>
                        {result.xpGained > 0 && <span className="ml-2 text-xs text-zinc-500">+{result.xpGained}XP</span>}
                      </div>
                    </div>
                    <p className="mb-2 text-xs font-medium">{result.passed ? "✅ 合格！" : "💡 もう少し改善できます"}</p>
                    {result.issues.length > 0 && (
                      <ul className="mb-2 space-y-0.5">
                        {result.issues.map((issue, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-zinc-700"><span className="mt-0.5 text-red-400">•</span><span>{issue}</span></li>
                        ))}
                      </ul>
                    )}
                    {result.suggestions.length > 0 && (
                      <ul className="mb-2 space-y-0.5">
                        {result.suggestions.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-zinc-700"><span className="mt-0.5 text-amber-500">→</span><span>{s}</span></li>
                        ))}
                      </ul>
                    )}
                    <div className="rounded-lg border border-zinc-200 bg-white p-2.5">
                      <p className="mb-0.5 text-[10px] font-medium text-zinc-500">良いコミットメッセージ例</p>
                      <p className="font-mono text-xs text-zinc-800">{result.exampleMessage}</p>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
            )}
          </div>

          {/* Input area — fixed at bottom */}
          <div className="shrink-0 border-t border-zinc-200 bg-white p-5">
            <textarea
              value={improvedMessage}
              onChange={(e) => setImprovedMessage(e.target.value)}
              placeholder="新しいコミットメッセージを入力..."
              rows={4}
              className="w-full resize-none rounded-lg border border-zinc-300 p-3 font-mono text-sm focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal"
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] text-zinc-400">例: fix(auth): ログイン時のエラー処理を修正する</span>
              <button
                onClick={handleReevaluate}
                disabled={submitting || !improvedMessage.trim()}
                className="rounded-lg bg-brand-teal px-5 py-2 text-xs font-medium text-white transition-all hover:brightness-110 disabled:opacity-50"
              >
                {submitting ? "評価中..." : "再評価する"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
