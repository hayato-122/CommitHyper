"use client";

import { useRouter } from "next/navigation";
import { SCORE } from "@/lib/evaluateCommit";

type CommitCardProps = {
  sha: string;
  message: string;
  authorName: string;
  committedAt: string;
  score: number;
  firstIssue?: string | null;
  improveHref: string;
  /** カードの密度: "normal" (候補一覧) or "compact" (全件一覧) */
  density?: "normal" | "compact";
};

export function CommitCard({
  sha,
  message,
  authorName,
  committedAt,
  score,
  firstIssue,
  improveHref,
  density = "normal",
}: CommitCardProps) {
  const router = useRouter();
  const compact = density === "compact";

  return (
    <div className={`rounded-xl border border-zinc-200 bg-white ${compact ? "p-4" : "p-5"}`}>
      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs text-zinc-400">
            {sha.slice(0, 7)}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-800">
            {message}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {authorName}
            {" · "}
            {new Date(committedAt).toLocaleDateString("ja-JP")}
          </p>
          {firstIssue && (
            <p className="mt-2 text-xs text-red-600">{firstIssue}</p>
          )}
        </div>
        <div className="flex flex-col items-end justify-between gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              score < SCORE.GOOD
                ? "bg-red-100 text-red-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {score}/100
          </span>
          <button
            onClick={() => router.push(improveHref)}
            className="rounded-lg bg-brand-teal px-4 py-1.5 text-xs font-medium text-white hover:brightness-110"
          >
            改善する
          </button>
        </div>
      </div>
    </div>
  );
}
