"use client";

import { useEffect, useState } from "react";
import { ScrollReveal } from "@/components/ScrollReveal";
import {
  Card,
  CardContent,
  CardDescription,
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
            </Card>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
