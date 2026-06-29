"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { RefreshCw, ArrowLeft, WifiOff } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isNetworkError =
    error.message?.includes("fetch failed") ||
    error.message?.includes("ENOTFOUND") ||
    error.message?.includes("ConnectTimeout") ||
    error.message?.includes("ECONNREFUSED");

  return (
    <div className="flex min-h-screen flex-col bg-pearl">
      <Header />
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-3xl border border-mist bg-white p-10 text-center shadow-subtle">
          {isNetworkError ? (
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
              <WifiOff className="h-7 w-7 text-red-400" />
            </div>
          ) : (
            <p
              className="text-[4rem] font-semibold leading-none tracking-[-0.04em] text-brand-teal"
              style={{
                fontFamily:
                  "var(--font-dm-sans), var(--font-noto-sans-jp), sans-serif",
              }}
            >
              !
            </p>
          )}

          <h1
            className="mt-4 text-heading-sm font-semibold text-midnight-ink"
            style={{
              fontFamily:
                "var(--font-dm-sans), var(--font-noto-sans-jp), sans-serif",
            }}
          >
            エラーが発生しました
          </h1>

          {isNetworkError && (
            <p className="mt-3 text-body leading-relaxed text-zinc-500">
              GitHubへの接続に失敗しました。
              <br />
              インターネット接続を確認してください。
            </p>
          )}

          {!isNetworkError && (
            <p className="mt-3 text-body leading-relaxed text-zinc-500">
              予期しないエラーが発生しました。
              <br />
              もう一度試してください。
            </p>
          )}

          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-2xl border border-mist bg-white px-6 py-3 text-body-sm font-medium text-zinc-600 transition-all hover:bg-pearl"
            >
              <RefreshCw className="h-4 w-4" />
              再試行
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-teal px-6 py-3 text-body-sm font-semibold text-white transition-all hover:brightness-110"
            >
              <ArrowLeft className="h-4 w-4" />
              ダッシュボードに戻る
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
