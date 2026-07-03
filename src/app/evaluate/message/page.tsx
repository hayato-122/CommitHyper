"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { EvaluationCard } from "@/components/EvaluationCard";
import { ScrollReveal } from "@/components/ScrollReveal";
import { MessageSquareText, Send } from "lucide-react";
import Link from "next/link";

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

export default function EvaluateMessagePage() {
  const [input, setInput] = useState("");
  const [evalResult, setEvalResult] = useState<EvalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      setError("コミットメッセージを入力してください");
      return;
    }
    setError("");
    setLoading(true);
    setEvalResult(null);

    try {
      const res = await fetch("/api/evaluate/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      if (!res.ok) throw new Error("評価に失敗しました");
      const data = await res.json();
      setEvalResult(data);
    } catch {
      setError("評価中にエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-pearl">
      <Header
        left={
          <Link
            href="/"
            className="flex items-center gap-1.5 text-body-sm text-zinc-500 transition-colors hover:text-midnight-ink"
          >
            ← トップへ
          </Link>
        }
        right={
          <Link href="/login" className="rounded-2xl bg-brand-teal px-5 py-2.5 text-body-sm font-semibold text-white transition-all hover:brightness-110">
            ログイン
          </Link>
        }
      />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-mint-wash px-3 py-1 text-caption font-medium text-brand-teal">
          <MessageSquareText className="h-3 w-3" />
          ログイン不要
        </div>
        <h1 className="text-[2rem] font-semibold leading-none tracking-tight text-midnight-ink">
          コミットメッセージを評価
        </h1>
        <p className="mt-4 text-body leading-relaxed text-zinc-500">
          コミットメッセージを入力するだけで、6つの観点からスコアリング＆改善提案を表示します。
        </p>

        <form onSubmit={handleSubmit} className="mt-8">
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (error) setError("");
            }}
            placeholder="例: feat(auth): add login button to navbar"
            rows={4}
            className="w-full resize-none rounded-2xl border border-mist bg-white px-4 py-3 font-mono text-body-sm text-midnight-ink placeholder:text-fog-gray focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
          />
          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setInput("fix(api): resolve null pointer exception in user handler")
                }
                className="rounded-2xl border border-mist bg-white px-4 py-2 text-caption text-zinc-500 transition-all hover:bg-pearl"
              >
                サンプル1
              </button>
              <button
                type="button"
                onClick={() =>
                  setInput("updated stuff")
                }
                className="rounded-2xl border border-mist bg-white px-4 py-2 text-caption text-zinc-500 transition-all hover:bg-pearl"
              >
                サンプル2
              </button>
            </div>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex items-center gap-2 rounded-2xl bg-brand-teal px-6 py-2.5 text-body-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
            >
              {loading ? "評価中..." : "評価する"}
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          {error && (
            <p className="mt-2 text-caption text-red-500">{error}</p>
          )}
        </form>

        {loading && (
          <div className="mt-10 text-center text-body text-zinc-500">
            評価中...
          </div>
        )}

        {evalResult && !loading && (
          <div className="mt-10">
            <ScrollReveal>
              <EvaluationCard
                score={evalResult.score}
                issues={evalResult.issues}
                suggestions={evalResult.suggestions}
                exampleMessage={evalResult.exampleMessage}
                label="評価結果"
                passed={evalResult.passed}
                aspectScores={evalResult.aspectScores}
                aiAvailable={evalResult.aiAvailable}
              />
            </ScrollReveal>
          </div>
        )}
      </main>
    </div>
  );
}
