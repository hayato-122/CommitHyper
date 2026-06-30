import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function HeroSection() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-24 text-center">
      <div className="mb-6 flex justify-center">
        <img src="/icon1.png" alt="CommitHyper" className="h-20 w-20 rounded-3xl" />
      </div>
      <h1
        className="text-[3.5rem] font-semibold leading-[1.05] tracking-tight text-midnight-ink"
        style={{ fontFamily: "var(--font-dm-sans), var(--font-noto-sans-jp), sans-serif" }}
      >
        コミットメッセージを
        <br />
        分析・改善する
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-body leading-relaxed text-zinc-500">
        GitHubのコミット履歴を分析し、改善ポイントを可視化。
        ルールベースの評価と改善提案を通じて、実践的なコミット力を身につけられます。
      </p>
      <div className="mt-10 flex items-center justify-center gap-4">
        <Link
          href="/login"
          className="inline-flex h-12 items-center gap-2 rounded-2xl bg-brand-teal px-8 text-body-sm font-semibold text-white transition-all hover:brightness-110"
        >
          GitHubで始める
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/guide"
          className="inline-flex h-12 items-center rounded-2xl border border-mist bg-white px-8 text-body-sm font-semibold text-midnight-ink transition-all hover:bg-zinc-50"
        >
          使い方を読む
        </Link>
      </div>
    </section>
  );
}
