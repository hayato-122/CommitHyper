"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, ArrowLeft } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ja" className="h-full">
      <body className="flex min-h-full flex-col bg-pearl">
        <main className="flex flex-1 items-center justify-center px-6 py-16">
          <div className="w-full max-w-md rounded-3xl border border-mist bg-white p-10 text-center shadow-subtle">
            {/* Error label */}
            <p
              className="text-[5rem] font-semibold leading-none tracking-[-0.04em] text-brand-teal"
              style={{
                fontFamily:
                  "var(--font-dm-sans), var(--font-noto-sans-jp), sans-serif",
              }}
            >
              500
            </p>

            {/* Heading */}
            <h1
              className="mt-4 text-heading-sm font-semibold text-midnight-ink"
              style={{
                fontFamily:
                  "var(--font-dm-sans), var(--font-noto-sans-jp), sans-serif",
              }}
            >
              エラーが発生しました
            </h1>

            {/* Description */}
            <p className="mt-4 text-body leading-relaxed text-zinc-500">
              予期しないエラーが発生しました。
              もう一度試すか、ダッシュボードに戻ってください。
            </p>

            {/* Actions */}
            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-2xl border border-mist bg-white px-6 py-3 text-body-sm font-medium text-zinc-600 transition-all hover:bg-pearl"
              >
                <RefreshCw className="h-4 w-4" />
                再試行
              </button>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-2xl bg-brand-teal px-6 py-3 text-body-sm font-semibold text-white transition-all hover:brightness-110"
              >
                <ArrowLeft className="h-4 w-4" />
                トップに戻る
              </Link>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
