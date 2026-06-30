import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
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
  );
}
