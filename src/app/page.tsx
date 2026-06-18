import Link from "next/link";
import {
  BarChart3,
  Sparkles,
  BookOpen,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-pearl">
      {/* Top Bar */}
      <header className="flex h-14 shrink-0 items-center justify-end border-b border-mist bg-white px-6">
        <div className="flex items-center gap-4">
          <Link href="/guide" className="text-body-sm text-zinc-500 hover:text-midnight-ink">ガイド</Link>
          <Link href="/login" className="rounded-xl bg-brand-teal px-5 py-2 text-body-sm font-semibold text-white transition-all hover:brightness-110">
            ログイン
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
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

        {/* Features Section */}
        <section className="border-t border-mist bg-white">
          <div className="mx-auto max-w-5xl px-6 py-24">
            <h2 className="text-center text-heading-sm font-semibold text-midnight-ink">
              できること
            </h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              <div className="rounded-2xl border border-mist bg-pearl p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-teal/10">
                  <BarChart3 className="h-6 w-6 text-brand-teal" />
                </div>
                <h3 className="mt-4 text-body-sm font-semibold text-midnight-ink">スコアリング</h3>
                <p className="mt-2 text-caption leading-relaxed text-zinc-500">
                  6項目・100点満点でコミットメッセージを自動評価。
                  具体的な問題点を洗い出します。
                </p>
              </div>
              <div className="rounded-2xl border border-mist bg-pearl p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-teal/10">
                  <Sparkles className="h-6 w-6 text-brand-teal" />
                </div>
                <h3 className="mt-4 text-body-sm font-semibold text-midnight-ink">改善サポート</h3>
                <p className="mt-2 text-caption leading-relaxed text-zinc-500">
                  悪い例と良い例を比較しながら、メッセージを練り直せます。
                  再評価で成長を実感。
                </p>
              </div>
              <div className="rounded-2xl border border-mist bg-pearl p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-teal/10">
                  <BookOpen className="h-6 w-6 text-brand-teal" />
                </div>
                <h3 className="mt-4 text-body-sm font-semibold text-midnight-ink">学習ガイド</h3>
                <p className="mt-2 text-caption leading-relaxed text-zinc-500">
                  推奨フォーマットや評価基準を詳しく解説。
                  ChatGPT用プロンプトも用意。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works Section */}
        <section className="mx-auto max-w-4xl px-6 py-24">
          <h2 className="text-center text-heading-sm font-semibold text-midnight-ink">
            使い方
          </h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {[
              { step: "01", title: "GitHubでログイン", desc: "GitHubアカウントで認証し、分析したいリポジトリを選択します。" },
              { step: "02", title: "自動分析", desc: "コミット履歴を取得し、メッセージをルールベースで評価。問題点を可視化します。" },
              { step: "03", title: "改善・成長", desc: "改善候補から選んでメッセージを練り直し。再評価でスコアアップを目指します。" },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-teal text-subheading font-bold text-white">
                  {item.step}
                </span>
                <h3 className="mt-4 text-body-sm font-semibold text-midnight-ink">{item.title}</h3>
                <p className="mt-2 text-caption leading-relaxed text-zinc-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t border-mist bg-white">
          <div className="mx-auto max-w-3xl px-6 py-24 text-center">
            <h2 className="text-heading-sm font-semibold text-midnight-ink">
              今すぐ始めましょう
            </h2>
            <p className="mt-4 text-body leading-relaxed text-zinc-500">
              あなたのコミット履歴が、最高の教材になります。
            </p>
            <div className="mt-8">
              <Link
                href="/login"
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-brand-teal px-8 text-body-sm font-semibold text-white transition-all hover:brightness-110"
              >
                GitHubでログイン
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-mist bg-white px-6 py-8 text-center">
        <div className="flex items-center justify-center gap-2">
          <img src="/icon1.png" alt="" className="h-6 w-6 rounded-md" />
          <span className="text-caption font-semibold text-midnight-ink">
            CommitHyper
          </span>
        </div>
        <p className="mt-3 text-caption text-fog-gray">
          Built for developers who care about commit quality.
        </p>
      </footer>
    </div>
  );
}
