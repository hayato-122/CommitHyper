"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-pearl">
      <Header />

      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-3xl border border-mist bg-white p-10 text-center shadow-subtle">
          <p
            className="text-[5rem] font-semibold leading-none tracking-[-0.04em] text-brand-teal"
            style={{
              fontFamily:
                "var(--font-dm-sans), var(--font-noto-sans-jp), sans-serif",
            }}
          >
            404
          </p>

          <h1
            className="mt-4 text-heading-sm font-semibold text-midnight-ink"
            style={{
              fontFamily:
                "var(--font-dm-sans), var(--font-noto-sans-jp), sans-serif",
            }}
          >
            リポジトリが見つかりませんでした
          </h1>

          <p className="mt-4 text-body leading-relaxed text-zinc-500">
            指定されたリポジトリが存在しないか、アクセス権限がありません。
          </p>

          <Link
            href="/dashboard"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-brand-teal px-6 py-3 text-body-sm font-semibold text-white transition-all hover:brightness-110"
          >
            <ArrowLeft className="h-4 w-4" />
            ダッシュボードに戻る
          </Link>
        </div>
      </main>
    </div>
  );
}
