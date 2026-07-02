import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, MessageSquareText } from "lucide-react";
import { proxyAuth } from "@/auth.config";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { QuickEvaluateForm } from "@/components/QuickEvaluateForm";
import { FeaturesSection } from "@/components/FeaturesSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { CTASection } from "@/components/CTASection";
import { LandingFooter } from "@/components/LandingFooter";

export default async function Home() {
  const session = await proxyAuth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-pearl">
      <Header
        right={
          <Link
            href="/login"
            className="rounded-xl bg-brand-teal px-5 py-2 text-body-sm font-semibold text-white transition-all hover:brightness-110"
          >
            ログイン
          </Link>
        }
      />
      <main className="flex-1">
        <HeroSection />
        <QuickEvaluateForm />

        {/* Standalone message evaluation CTA */}
        <section className="mx-auto max-w-4xl px-6 pb-24 text-center">
          <Link
            href="/evaluate/message"
            className="inline-flex items-center gap-3 rounded-3xl border border-mist bg-white px-8 py-5 shadow-subtle transition-all hover:border-brand-teal/30 hover:shadow-md"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-mint-wash">
              <MessageSquareText className="h-5 w-5 text-brand-teal" />
            </span>
            <span className="text-left">
              <span className="block text-body-sm font-semibold text-midnight-ink">
                コミットメッセージを直接評価する
              </span>
              <span className="block text-caption text-zinc-500">
                リポジトリ不要。メッセージを入力するだけでスコアリング
              </span>
            </span>
            <ArrowRight className="h-5 w-5 shrink-0 text-zinc-400" />
          </Link>
        </section>

        <FeaturesSection />
        <HowItWorksSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
