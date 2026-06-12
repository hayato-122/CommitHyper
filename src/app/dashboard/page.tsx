"use client"; // Motion（アニメーション）を使うために必要

import { ScrollReveal } from "@/components/ScrollReveal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// モックデータ
const mockRepos = [
  {
    id: 1,
    name: "my-portfolio",
    owner: { login: "taro-yamada" },
    full_name: "taro-yamada/my-portfolio",
    private: false,
    description: "My portfolio site",
  },
  {
    id: 2,
    name: "secret-project",
    owner: { login: "taro-yamada" },
    full_name: "taro-yamada/secret-project",
    private: true,
    description: "Internal tool",
  },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <ScrollReveal>
        <h1 className="mb-2 text-2xl font-semibold">リポジトリを選択</h1>
        <p className="mb-8 text-zinc-500">
          改善したいリポジトリを選んでください
        </p>
      </ScrollReveal>

      <div className="grid gap-4">
        {mockRepos.map((repo) => (
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
