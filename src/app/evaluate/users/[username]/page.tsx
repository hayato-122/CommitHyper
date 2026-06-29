"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { ScrollReveal } from "@/components/ScrollReveal";
import { RepoCard } from "@/components/RepoCard";
import { ArrowLeft } from "lucide-react";

type Repo = {
  id: number;
  name: string;
  owner: { login: string };
  full_name: string;
  private: boolean;
  description: string | null;
};

export default function UserReposPage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/evaluate/users/${username}/repos`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `エラー (${res.status})`);
        }
        if (!cancelled) setRepos(await res.json());
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "読み込みに失敗しました");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [username]);

  function handleSelect(repo: Repo) {
    router.push(`/evaluate/${repo.owner.login}/${repo.name}`);
  }

  return (
    <div className="flex min-h-screen flex-col bg-pearl">
      <Header
        left={
          <>
            <div className="h-4 w-px bg-mist" />
            <Link href="/" className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600">
              <ArrowLeft className="h-3 w-3" />
              トップに戻る
            </Link>
            <div className="h-4 w-px bg-mist" />
            <span className="text-sm font-medium text-zinc-600">{username} のリポジトリ</span>
          </>
        }
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-16">
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-brand-teal border-t-transparent" />
              <p className="text-body text-zinc-500">リポジトリを読み込み中...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center py-32">
            <div className="w-full max-w-md rounded-3xl border border-mist bg-white p-10 text-center shadow-subtle">
              <p className="text-heading-lg font-semibold text-zinc-300">!</p>
              <h1 className="mt-2 text-heading-sm font-semibold text-midnight-ink">読み込めませんでした</h1>
              <p className="mt-2 text-body text-zinc-500">{error}</p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button onClick={() => window.location.reload()} className="rounded-2xl border border-mist bg-white px-6 py-3 text-body-sm font-medium text-zinc-600 transition-all hover:bg-pearl">再試行</button>
                <Link href="/" className="rounded-2xl bg-brand-teal px-6 py-3 text-body-sm font-semibold text-white transition-all hover:brightness-110">トップに戻る</Link>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            <ScrollReveal>
              <div className="mb-12">
                <h1 className="text-[2rem] font-semibold leading-none tracking-tight text-midnight-ink">
                  {username} の公開リポジトリ
                </h1>
                <p className="mt-3 text-body text-zinc-500">
                  評価したいリポジトリを選んでください
                </p>
              </div>
            </ScrollReveal>

            {repos.length === 0 ? (
              <div className="rounded-3xl border border-mist bg-white p-16 text-center shadow-subtle">
                <p className="text-body-sm text-zinc-500">公開リポジトリがありません</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {repos.map((repo) => (
                  <RepoCard key={repo.id} repo={repo} onSelect={handleSelect} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
