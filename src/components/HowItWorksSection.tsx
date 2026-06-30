const steps = [
  {
    step: "01",
    title: "GitHubでログイン",
    desc: "GitHubアカウントで認証し、分析したいリポジトリを選択します。",
  },
  {
    step: "02",
    title: "自動分析",
    desc: "コミット履歴を取得し、メッセージをルールベースで評価。問題点を可視化します。",
  },
  {
    step: "03",
    title: "改善・成長",
    desc: "改善候補から選んでメッセージを練り直し。再評価でスコアアップを目指します。",
  },
];

export function HowItWorksSection() {
  return (
    <section className="mx-auto max-w-4xl px-6 py-24">
      <h2 className="text-center text-heading-sm font-semibold text-midnight-ink">
        使い方
      </h2>
      <div className="mt-12 grid gap-8 sm:grid-cols-3">
        {steps.map((item) => (
          <div key={item.step} className="text-center">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-teal text-subheading font-bold text-white">
              {item.step}
            </span>
            <h3 className="mt-4 text-body-sm font-semibold text-midnight-ink">
              {item.title}
            </h3>
            <p className="mt-2 text-caption leading-relaxed text-zinc-500">
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
