import Link from "next/link";

export function LandingFooter() {
  return (
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
  );
}
