"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight } from "lucide-react";

export function QuickEvaluateForm() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      setError("リポジトリ名を入力してください");
      return;
    }

    // owner/name または GitHub URL をパース
    const urlMatch = trimmed.match(/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/);
    const userUrlMatch = trimmed.match(/github\.com\/([\w.-]+)\/?$/);
    const plainMatch = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
    const plainUserMatch = trimmed.match(/^@?([\w.-]+)$/);

    setError("");

    if (urlMatch) {
      router.push(`/evaluate/${urlMatch[1]}/${urlMatch[2]}`);
    } else if (userUrlMatch) {
      router.push(`/evaluate/users/${userUrlMatch[1]}`);
    } else if (plainMatch) {
      router.push(`/evaluate/${plainMatch[1]}/${plainMatch[2]}`);
    } else if (plainUserMatch) {
      router.push(`/evaluate/users/${plainUserMatch[1]}`);
    } else {
      setError("owner/repo、ユーザー名、または GitHub URL で入力してください");
    }
  }

  return (
    <section
      className="mx-auto max-w-4xl px-6 py-24 text-center"
      style={{ fontFamily: "var(--font-inter), var(--font-noto-sans-jp), sans-serif" }}
    >
      {/* Label */}
      <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-mint-wash px-3 py-1 text-caption font-medium text-brand-teal">
        <Search className="h-3 w-3" />
        ログイン不要
      </div>

      {/* Heading */}
      <h2
        className="mt-4 text-[2rem] font-semibold leading-none tracking-tight text-midnight-ink"
        style={{ fontFamily: "var(--font-dm-sans), var(--font-noto-sans-jp), sans-serif" }}
      >
        公開リポジトリを評価する
      </h2>

      <p className="mx-auto mt-4 max-w-lg text-body leading-relaxed text-zinc-500">
        GitHubの公開リポジトリなら、ログインなしでもコミットメッセージを分析できます。
        まずは有名リポジトリのコミットを見てみましょう。
      </p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="mx-auto mt-8 max-w-md">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (error) setError("");
              }}
              placeholder="owner/repo-name または GitHub URL"
              className="w-full h-12 rounded-2xl border border-mist bg-white px-4 pr-10 text-body-sm text-midnight-ink placeholder:text-fog-gray focus:border-brand-teal focus:outline-none focus:ring-2 focus:ring-brand-teal/20"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fog-gray" />
          </div>
          <button
            type="submit"
            className="flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-brand-teal px-6 text-body-sm font-semibold text-white transition-all hover:brightness-110"
          >
            評価する
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        {error && (
          <p className="mt-2 text-left text-caption text-red-500">{error}</p>
        )}
      </form>
    </section>
  );
}
