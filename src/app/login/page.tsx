"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { Header } from "@/components/Header";
import { LandingFooter } from "@/components/LandingFooter";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-pearl">
      <Header />

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-3xl border border-mist bg-white p-10 shadow-subtle">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-teal">
              <img src="/icon1.png" alt="CommitHyper" className="h-8 w-8" />
            </div>
            <h1
              className="text-[2rem] font-semibold leading-none tracking-tight text-midnight-ink"
              style={{
                fontFamily:
                  "var(--font-dm-sans), var(--font-noto-sans-jp), sans-serif",
              }}
            >
              CommitHyper
            </h1>
          </div>

          <p className="ja-text mb-8 text-center text-body leading-[1.8] text-zinc-500">
            GitHubのコミットメッセージを分析し、
            <br />
            改善タスクとして学べるWebアプリです。
            <br />
            あなたのGitHub履歴で、実践的なコミット力を身につけよう。
          </p>

          <div className="mb-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-mist" />
            <span className="text-caption font-medium text-fog-gray">
              ログイン
            </span>
            <div className="h-px flex-1 bg-mist" />
          </div>

          <button
            onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
            className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-brand-teal px-6 text-body-sm font-medium text-white transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-teal focus-visible:ring-offset-2"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHubでログイン
          </button>

          <p className="mt-4 text-center text-caption leading-relaxed text-fog-gray">
            ログインすると、公開リポジトリおよび
            <br />
            非公開リポジトリへのアクセス権限を許可します。
            <br />
            私たちがあなたのコードを変更することはありません。
          </p>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
