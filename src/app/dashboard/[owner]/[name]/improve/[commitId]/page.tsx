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
  const [result, setResult] = useState<{
    score: number;
    issues: string[];
    suggestions: string[];
    exampleMessage: string;
    passed: boolean;
    xpGained: number;
  } | null>(null);
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
      if (found?.sha) {
        const diffRes = await fetch(
          `/api/repos/${owner}/${name}/commits/${found.sha}/diff`
        );
        if (diffRes.ok) setDiff(await diffRes.text());
      }
      setCommit(found ?? null);
      if (evalRes.ok) setOriginalEval(await evalRes.json());
      setLoading(false);
    }
    load();
  }, [owner, name, commitId]);

  async function handleReevaluate() {
    if (!improvedMessage.trim()) return;
    setSubmitting(true);
    const res = await fetch(
      `/api/repos/${owner}/${name}/improve/${commitId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: improvedMessage }),
      }
    );
    setResult(await res.json());
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pearl">
        <p className="text-body text-zinc-500">読み込み中...</p>
      </div>
    );
  }
  if (!commit) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pearl">
        <p className="text-body text-zinc-500">コミットが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-pearl">
      {/* ===== Top Bar ===== */}
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-mist bg-white px-6">
        <button
          onClick={() => router.push(`/dashboard/${owner}/${name}`)}
          className="flex items-center gap-1.5 text-body-sm text-zinc-500 transition-colors hover:text-midnight-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          ダッシュボードに戻る
        </button>
        <div className="h-4 w-px bg-mist" />
        <span className="text-body-sm text-zinc-500">
          {commit.sha.slice(0, 7)} · {commit.authorName}
        </span>
        <div className="h-4 w-px bg-mist" />
        <a
          href={`https://github.com/${owner}/${name}/commit/${commit.sha}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-body-sm font-medium text-brand-teal transition-opacity hover:opacity-80"
        >
          GitHubで見る ↗
        </a>
      </header>

      {/* ===== Body ===== */}
      <div className="flex flex-1 overflow-hidden">
        {/* ===== Left: Diff ===== */}
        <div className="flex w-1/2 flex-col border-r border-mist bg-white">
          <div className="flex h-10 shrink-0 items-center border-b border-mist px-5">
            <span className="text-caption font-medium text-zinc-500">diff</span>
          </div>
          {diff ? (
            <div className="flex-1 overflow-auto font-mono text-caption leading-relaxed">
              {diff.split("\n").map((line, i) => {
                if (line.startsWith("+") && !line.startsWith("+++")) {
                  return (
                    <div key={i} className="flex">
                      <span className="w-10 shrink-0 select-none bg-green-50 text-right pr-3 text-[10px] leading-5 text-green-400">
                        {i + 1}
                      </span>
                      <span className="flex-1 bg-green-50 px-3 text-green-800 break-all">
                        {line}
                      </span>
                    </div>
                  );
                }
                if (line.startsWith("-") && !line.startsWith("---")) {
                  return (
                    <div key={i} className="flex">
                      <span className="w-10 shrink-0 select-none bg-red-50 text-right pr-3 text-[10px] leading-5 text-red-400">
                        {i + 1}
                      </span>
                      <span className="flex-1 bg-red-50 px-3 text-red-800 break-all">
                        {line}
                      </span>
                    </div>
                  );
                }
                if (line.startsWith("@@")) {
                  return (
                    <div key={i} className="flex">
                      <span className="w-10 shrink-0 select-none bg-blue-50 text-right pr-3 text-[10px] leading-5 text-blue-300">
                        {i + 1}
                      </span>
                      <span className="flex-1 bg-blue-50 px-3 text-blue-600 font-semibold">
                        {line}
                      </span>
                    </div>
                  );
                }
                if (
                  line.startsWith("diff --git") ||
                  line.startsWith("---") ||
                  line.startsWith("+++")
                ) {
                  return (
                    <div key={i} className="flex bg-pearl/50">
                      <span className="w-10 shrink-0 select-none text-right pr-3 text-[10px] leading-5 text-zinc-300">
                        {i + 1}
                      </span>
                      <span className="flex-1 px-3 text-zinc-500 font-medium">
                        {line}
                      </span>
                    </div>
                  );
                }
                return (
                  <div key={i} className="flex">
                    <span className="w-10 shrink-0 select-none text-right pr-3 text-[10px] leading-5 text-zinc-300">
                      {i + 1}
                    </span>
                    <span className="flex-1 px-3 text-zinc-700">{line}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-caption text-zinc-400">diffを読み込めませんでした</p>
            </div>
          )}
        </div>

        {/* ===== Right: Reference + Input ===== */}
        <div className="flex w-1/2 flex-col bg-pearl">
          {/* Scrollable: original message + evaluation + result */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Original Message Card */}
            <ScrollReveal>
              <div className="mb-6 rounded-2xl border border-mist bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-body-sm font-semibold text-midnight-ink">
                    元のメッセージ
                  </h2>
                  <span className="rounded-full bg-red-100 px-3 py-1 text-caption font-semibold text-red-700">
                    {commit.currentScore}<span className="font-normal text-red-500">/100</span>
                  </span>
                </div>
                <p className="font-mono text-body-sm leading-relaxed text-midnight-ink">
                  {commit.message}
                </p>
              </div>
            </ScrollReveal>

            {/* Evaluation Card */}
            {originalEval && (
              <ScrollReveal>
                <div className="mb-6 rounded-2xl border border-mist bg-white p-5">
                  <h2 className="mb-4 text-body-sm font-semibold text-midnight-ink">
                    評価結果
                  </h2>

                  {/* Issues */}
                  {originalEval.issues.length > 0 && (
                    <div className="mb-4">
                      <p className="mb-2 text-caption font-medium text-zinc-500">
                        問題点
                      </p>
                      <ul className="space-y-1.5">
                        {originalEval.issues.map((issue, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-body-sm text-zinc-600 leading-relaxed"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                            <span>{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggestions */}
                  {originalEval.suggestions.length > 0 && (
                    <div className="mb-4">
                      <p className="mb-2 text-caption font-medium text-zinc-500">
                        改善提案
                      </p>
                      <ul className="space-y-1.5">
                        {originalEval.suggestions.map((s, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-body-sm text-zinc-600 leading-relaxed"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-teal" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Good Example */}
                  <div className="rounded-xl border border-mist bg-snow p-4">
                    <p className="mb-1.5 text-caption font-medium text-zinc-500">
                      良いコミットメッセージ例
                    </p>
                    <p className="font-mono text-body-sm leading-relaxed text-midnight-ink">
                      {originalEval.exampleMessage}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            )}

            {/* Re-evaluation Result */}
            {result && (
              <div className="mb-4">
                <ScrollReveal>
                  <div
                    className={`rounded-2xl border p-5 ${
                      result.passed
                        ? "border-leaf-soft/50 bg-white"
                        : "border-cream-paper bg-white"
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-body-sm font-semibold text-midnight-ink">
                        再評価結果
                      </h2>
                      <div className="text-right">
                        <span
                          className={`text-heading-sm font-bold ${
                            result.passed
                              ? "text-leaf-soft"
                              : "text-amber-600"
                          }`}
                        >
                          {result.score}
                          <span className="text-body-sm font-normal text-zinc-500">
                            /100
                          </span>
                        </span>
                        {result.xpGained > 0 && (
                          <span className="ml-3 text-body-sm font-medium text-brand-teal">
                            +{result.xpGained} XP
                          </span>
                        )}
                      </div>
                    </div>
                    <p
                      className={`mb-3 text-body-sm font-semibold ${
                        result.passed ? "text-leaf-soft" : "text-zinc-500"
                      }`}
                    >
                      {result.passed
                        ? "合格です！良いコミットメッセージです。"
                        : "もう少し改善できます"}
                    </p>
                    {result.issues.length > 0 && (
                      <ul className="mb-3 space-y-1">
                        {result.issues.map((issue, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-body-sm text-zinc-600 leading-relaxed"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                            <span>{issue}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {result.suggestions.length > 0 && (
                      <ul className="mb-3 space-y-1">
                        {result.suggestions.map((s, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-body-sm text-zinc-600 leading-relaxed"
                          >
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-teal" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {result.exampleMessage && (
                      <div className="rounded-xl border border-mist bg-snow p-4">
                        <p className="mb-1.5 text-caption font-medium text-zinc-500">
                          良いコミットメッセージ例
                        </p>
                        <p className="font-mono text-body-sm leading-relaxed text-midnight-ink">
                          {result.exampleMessage}
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollReveal>
              </div>
            )}
          </div>

          {/* Input area — fixed at bottom */}
          <div className="shrink-0 border-t border-mist bg-white p-6">
            <textarea
              value={improvedMessage}
              onChange={(e) => setImprovedMessage(e.target.value)}
              placeholder="新しいコミットメッセージを入力..."
              rows={4}
              className="w-full resize-none rounded-xl border border-mist bg-white px-4 py-3 font-mono text-body-sm text-midnight-ink placeholder:text-fog-gray focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
            />
            <div className="mt-4 flex items-center justify-between">
              <span className="text-caption text-zinc-500">
                type(scope): 「何を」「なぜ」変えたか具体的に
              </span>
              <button
                onClick={handleReevaluate}
                disabled={submitting || !improvedMessage.trim()}
                className="rounded-xl bg-brand-teal px-6 py-2.5 text-body-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50 disabled:hover:brightness-100"
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
