"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { ScrollReveal } from "@/components/ScrollReveal";
import { DiffViewer } from "@/components/DiffViewer";
import { EvaluationCard } from "@/components/EvaluationCard";
import { ArrowLeft, Check, Clipboard } from "lucide-react";

type AspectScores = {
  format: number;
  type: number;
  summary: number;
  why: number;
  readability: number;
  traceability: number;
};

type EvalData = {
  score: number;
  rank: string;
  issues: string[];
  suggestions: string[];
  exampleMessage: string;
  passed?: boolean;
  aspectScores?: AspectScores;
  aiAvailable?: boolean;
};

function ImproveContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const owner = params.owner as string;
  const name = params.name as string;
  const sha = searchParams.get("sha") ?? "";
  const message = searchParams.get("message") ?? "";
  const initialScore = parseInt(searchParams.get("score") ?? "0", 10);

  const [improvedMessage, setImprovedMessage] = useState("");
  const [activeEval, setActiveEval] = useState<EvalData | null>(null);
  const [diff, setDiff] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ available: boolean; message?: string } | null>(null);

  useEffect(() => {
    fetch("/api/ai-status")
      .then((r) => r.json())
      .then((d) => setAiStatus(d))
      .catch(() => setAiStatus({ available: false, message: "AI状態の取得に失敗" }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      // diff と初期評価を並列取得
      const [diffRes, evalRes] = await Promise.all([
        fetch(`/api/evaluate/${owner}/${name}/commits/${sha}/diff`).catch(() => null),
        fetch("/api/evaluate/improve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message }),
        }),
      ]);
      if (!cancelled) {
        if (diffRes?.ok) {
          setDiff(await diffRes.text());
        }
        if (evalRes.ok) {
          setActiveEval(await evalRes.json());
        }
        setImprovedMessage(message);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [owner, name, sha, message]);

  async function handleReevaluate() {
    if (!improvedMessage.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/evaluate/improve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: improvedMessage }),
    });
    const data = await res.json();
    setActiveEval(data);
    setSubmitting(false);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(improvedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pearl">
        <p className="text-body text-zinc-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-pearl">
      <Header
        left={
          <>
            <div className="h-4 w-px bg-mist" />
            <button
              onClick={() => router.push(`/evaluate/${owner}/${name}`)}
              className="flex items-center gap-1.5 text-body-sm text-zinc-500 transition-colors hover:text-midnight-ink"
            >
              <ArrowLeft className="h-4 w-4" />
              評価結果に戻る
            </button>
            <div className="hidden md:block h-4 w-px bg-mist" />
            <span className="text-body-sm text-zinc-500 truncate max-w-[80px] md:max-w-none">
              {sha.slice(0, 7)}
            </span>
            <div className="h-4 w-px bg-mist" />
            <a
              href={`https://github.com/${owner}/${name}/commit/${sha}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-body-sm font-medium text-brand-teal transition-opacity hover:opacity-80"
            >
              GitHubで見る ↗
            </a>
          </>
        }
      />

      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        {/* Left: Diff */}
        <div className="flex w-full md:w-1/2 flex-col border-b md:border-b-0 md:border-r border-mist bg-white">
          <div className="flex h-10 shrink-0 items-center border-b border-mist px-5">
            <span className="text-caption font-medium text-zinc-500">diff</span>
          </div>
          <DiffViewer diff={diff} />
        </div>

        {/* Right: Reference + Input */}
        <div className="flex w-full md:w-1/2 flex-col bg-pearl min-h-0">
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {/* AI status badge */}
            {aiStatus && !aiStatus.available && (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-caption text-amber-700">
                {aiStatus.message || "AI評価が利用できません。ルールベースの評価のみ表示されます。"}
              </div>
            )}

            {/* Original Message Card */}
            <ScrollReveal>
              <div className="mb-6 rounded-3xl border border-mist bg-white p-5 shadow-subtle">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-body-sm font-semibold text-midnight-ink">
                    元のメッセージ
                  </h2>
                  <span className="rounded-full bg-red-100 px-3 py-1 text-caption font-semibold text-red-700">
                    {initialScore}
                    <span className="font-normal text-red-500">/100</span>
                  </span>
                </div>
                <p className="font-mono text-body-sm leading-relaxed text-midnight-ink">
                  {message}
                </p>
              </div>
            </ScrollReveal>

            {/* Evaluation Card */}
            {activeEval && (
              <ScrollReveal>
                <EvaluationCard
                  score={activeEval.score}
                  issues={activeEval.issues}
                  suggestions={activeEval.suggestions}
                  exampleMessage={activeEval.exampleMessage}
                  label="再評価結果"
                  passed={activeEval.passed}
                  aspectScores={activeEval.aspectScores}
                  aiAvailable={activeEval.aiAvailable}
                />
              </ScrollReveal>
            )}
          </div>

          {/* Input area */}
          <div className="shrink-0 border-t border-mist bg-white p-6">
            <textarea
              value={improvedMessage}
              onChange={(e) => setImprovedMessage(e.target.value)}
              placeholder="新しいコミットメッセージを入力..."
              rows={4}
              className="w-full resize-none rounded-2xl border border-mist bg-white px-4 py-3 font-mono text-body-sm text-midnight-ink placeholder:text-fog-gray focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
            />
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-2xl border border-mist bg-white px-4 py-2 text-body-sm text-zinc-500 transition-all hover:bg-pearl"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-leaf-soft" />
                    コピーしました
                  </>
                ) : (
                  <>
                    <Clipboard className="h-3.5 w-3.5" />
                    コピー
                  </>
                )}
              </button>
              <button
                onClick={handleReevaluate}
                disabled={submitting || !improvedMessage.trim()}
                className="rounded-2xl bg-brand-teal px-6 py-2.5 text-body-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
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

export default function EvaluateImprovePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-pearl">
          <p className="text-body text-zinc-500">読み込み中...</p>
        </div>
      }
    >
      <ImproveContent />
    </Suspense>
  );
}
