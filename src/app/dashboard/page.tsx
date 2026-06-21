"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Header } from "@/components/Header";
import { RepoCard } from "@/components/RepoCard";

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
      <Header user={user} />

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
            <RepoCard key={repo.id} repo={repo} onSelect={handleSelect} />
          ))}
        </div>
      </main>
    </div>
  );
}
