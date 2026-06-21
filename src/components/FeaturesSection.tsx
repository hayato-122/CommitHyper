import { BarChart3, Sparkles, BookOpen } from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "スコアリング",
    desc: "6項目・100点満点でコミットメッセージを自動評価。具体的な問題点を洗い出します。",
  },
  {
    icon: Sparkles,
    title: "改善サポート",
    desc: "悪い例と良い例を比較しながら、メッセージを練り直せます。再評価で成長を実感。",
  },
  {
    icon: BookOpen,
    title: "学習ガイド",
    desc: "推奨フォーマットや評価基準を詳しく解説。ChatGPT用プロンプトも用意。",
  },
];

export function FeaturesSection() {
  return (
    <section className="border-t border-mist bg-white">
      <div className="mx-auto max-w-5xl px-6 py-24">
        <h2 className="text-center text-heading-sm font-semibold text-midnight-ink">
          できること
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-2xl border border-mist bg-pearl p-6 text-center"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-teal/10">
                  <Icon className="h-6 w-6 text-brand-teal" />
                </div>
                <h3 className="mt-4 text-body-sm font-semibold text-midnight-ink">
                  {f.title}
                </h3>
                <p className="mt-2 text-caption leading-relaxed text-zinc-500">
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
