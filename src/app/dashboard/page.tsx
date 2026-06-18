"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ScrollReveal } from "@/components/ScrollReveal";


type Repo = {
  id: number;
  name: string;
  owner: { login: string };
  full_name: string;
  private: boolean;
  description: string | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ name: string; avatarUrl: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/repos").then((r) => r.json()),
      fetch("/api/user/progress").then((r) => r.json()),
    ]).then(([repoData, userData]) => {
      setRepos(Array.isArray(repoData) ? repoData : []);
      if (userData.name) setUser({ name: userData.name, avatarUrl: userData.avatarUrl });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleSelect(repo: Repo) {
    const res = await fetch("/api/repos/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        githubRepoId: repo.id,
        name: repo.name,
        owner: repo.owner.login,
        fullName: repo.full_name,
        isPrivate: repo.private,
      }),
    });

    if (res.ok) {
      router.push(`/dashboard/${repo.owner.login}/${repo.name}`);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">リポジトリを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-pearl">
      <header className="flex h-14 items-center justify-between border-b border-mist bg-white px-6">
        <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-teal">
            <img src="/icon1.png" alt="" className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium text-midnight-ink">CommitHyper</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/guide"
            className="text-xs text-zinc-400 hover:text-zinc-600"
          >
            ガイド
          </Link>
          {user && (
          <button onClick={() => signOut()} className="flex items-center gap-2 text-xs text-zinc-500 hover:text-midnight-ink">
            {user.avatarUrl && (
              <img src={user.avatarUrl} alt="" className="h-6 w-6 rounded-full" />
            )}
            {user.name}
          </button>
        )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-8 py-16">
        <ScrollReveal>
          <div className="mb-12">
            <h1 className="text-[2rem] font-semibold leading-none tracking-tight text-midnight-ink">
              リポジトリを選択
            </h1>
            <p className="mt-3 text-body text-zinc-500">
              改善したいリポジトリを選んでください
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {repos.map((repo) => (
            <ScrollReveal key={repo.id} delay={0.05}>
              <button
                onClick={() => handleSelect(repo)}
                className="group w-full rounded-3xl border border-mist bg-white p-6 text-left transition-all hover:border-brand-teal/30 hover:shadow-subtle"
              >
                {/* Repo name + icon */}
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="truncate text-subheading font-semibold leading-tight text-midnight-ink">
                      {repo.name}
                    </h3>
                    <p className="mt-1 text-body-sm text-zinc-500">
                      {repo.owner.login}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-xl px-2.5 py-1 text-caption font-medium ${
                      repo.private
                        ? "bg-cream-paper text-amber-700"
                        : "bg-mint-wash text-brand-teal"
                    }`}
                  >
                    {repo.private ? "Private" : "Public"}
                  </span>
                </div>

                {/* Description */}
                {repo.description ? (
                  <p className="line-clamp-2 text-body-sm leading-relaxed text-zinc-500">
                    {repo.description}
                  </p>
                ) : (
                  <p className="text-body-sm leading-relaxed text-fog-gray italic">
                    説明なし
                  </p>
                )}

                {/* Select hint */}
                <div className="mt-5 flex items-center gap-2 text-body-sm font-medium text-brand-teal opacity-0 transition-opacity group-hover:opacity-100">
                  選択する
                  <span aria-hidden="true">→</span>
                </div>
              </button>
            </ScrollReveal>
          ))}
        </div>
      </main>
    </div>
  );
}
