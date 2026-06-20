import Link from "next/link";
import { GitCommitHorizontal } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-pearl px-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-teal">
            <GitCommitHorizontal className="h-10 w-10 text-white" />
          </div>
        </div>
        <h1
          className="text-[2.5rem] font-semibold leading-none tracking-tight text-midnight-ink"
          style={{
            fontFamily:
              "var(--font-dm-sans), var(--font-noto-sans-jp), sans-serif",
          }}
        >
          CommitHyper
        </h1>
        <p className="mt-4 text-body leading-relaxed text-zinc-500">
          コミットメッセージを分析・改善し、
          <br />
          実践的なコミット力を身につける
        </p>
        <div className="mt-8">
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-brand-teal px-8 text-body-sm font-semibold text-white transition-all hover:brightness-110"
          >
            ログインする
          </Link>
        </div>
        <p className="mt-12 text-caption text-fog-gray">
          Built for developers who care about commit quality.
        </p>
      </div>
    </div>
  );
}
