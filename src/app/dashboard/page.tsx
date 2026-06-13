"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScrollReveal } from "@/components/ScrollReveal";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

  useEffect(() => {
    fetch("/api/repos")
      .then((res) => res.json())
      .then((data) => {
        setRepos(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
    <div className="mx-auto max-w-4xl px-6 py-12">
      <ScrollReveal>
        <h1 className="mb-2 text-2xl font-semibold">リポジトリを選択</h1>
        <p className="mb-8 text-zinc-500">
          改善したいリポジトリを選んでください
        </p>
      </ScrollReveal>

      <div className="grid gap-4">
        {repos.map((repo) => (
          <ScrollReveal key={repo.id}>
            <Card>
              <CardHeader>
                <CardTitle>{repo.name}</CardTitle>
                <CardDescription>{repo.full_name}</CardDescription>
              </CardHeader>
              <CardContent>
                <span
                  className={
                    repo.private
                      ? "text-xs text-amber-600"
                      : "text-xs text-emerald-600"
                  }
                >
                  {repo.private ? "Private" : "Public"}
                </span>
                {repo.description && (
                  <p className="mt-2 text-sm text-zinc-500">
                    {repo.description}
                  </p>
                )}
              </CardContent>
              <CardFooter>
                <button
                  onClick={() => handleSelect(repo)}
                  className="w-full rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white transition-all hover:brightness-110"
                >
                  このリポジトリを使う
                </button>
              </CardFooter>
            </Card>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
