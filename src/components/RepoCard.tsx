"use client";

import { ScrollReveal } from "@/components/ScrollReveal";

type Repo = {
  id: number;
  name: string;
  owner: { login: string };
  full_name: string;
  private: boolean;
  description: string | null;
};

type RepoCardProps = {
  repo: Repo;
  onSelect: (repo: Repo) => void;
};

export function RepoCard({ repo, onSelect }: RepoCardProps) {
  return (
    <ScrollReveal delay={0.05}>
      <button
        onClick={() => onSelect(repo)}
        className="group w-full rounded-3xl border border-mist bg-white p-6 text-left transition-all hover:border-brand-teal/30 hover:shadow-subtle"
      >
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
        {repo.description ? (
          <p className="line-clamp-2 text-body-sm leading-relaxed text-zinc-500">
            {repo.description}
          </p>
        ) : (
          <p className="text-body-sm leading-relaxed text-fog-gray italic">
            説明なし
          </p>
        )}
        <div className="mt-5 flex items-center gap-2 text-body-sm font-medium text-brand-teal opacity-0 transition-opacity group-hover:opacity-100">
          選択する
          <span aria-hidden="true">→</span>
        </div>
      </button>
    </ScrollReveal>
  );
}
