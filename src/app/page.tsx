import { redirect } from "next/navigation";
import Link from "next/link";
import { middlewareAuth } from "@/auth.config";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { QuickEvaluateForm } from "@/components/QuickEvaluateForm";
import { FeaturesSection } from "@/components/FeaturesSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { CTASection } from "@/components/CTASection";
import { LandingFooter } from "@/components/LandingFooter";

export default async function Home() {
  const session = await middlewareAuth();
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
        <FeaturesSection />
        <HowItWorksSection />
        <CTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
