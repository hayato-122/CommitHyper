import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { SCORE, WEIGHT } from "@/lib/evaluateCommit";

type AspectScores = {
  format: number;
  type: number;
  summary: number;
  why: number;
  readability: number;
  traceability: number;
};

type EvaluationCardProps = {
  score: number;
  issues: string[];
  suggestions: string[];
  exampleMessage: string;
  label?: string;
  passed?: boolean;
  aspectScores?: AspectScores;
};

const BARS = [
  { key: "format" as const, label: "形式(scope)", max: WEIGHT.FORMAT_SCOPE },
  { key: "type" as const, label: "変更種別", max: WEIGHT.TYPE_VALID },
  { key: "summary" as const, label: "具体性(AI)", max: WEIGHT.AI_SUMMARY_MAX },
  { key: "why" as const, label: "Why(AI)", max: WEIGHT.AI_WHY_MAX },
  { key: "readability" as const, label: "読みやすさ", max: WEIGHT.READABILITY },
  { key: "traceability" as const, label: "追跡性", max: WEIGHT.TRACEABILITY },
];

function barColor(pct: number) {
  if (pct >= 90) return "bg-brand-teal";
  if (pct >= 60) return "bg-leaf-soft";
  return "bg-zinc-300";
}

export function EvaluationCard({
  score, issues, suggestions, exampleMessage,
  label = "評価結果", passed, aspectScores,
}: EvaluationCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="rounded-3xl border border-mist bg-white p-5 shadow-subtle">
      {/* Header: label + score */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-body-sm font-semibold text-midnight-ink">{label}</h2>
        <span className="text-heading-sm font-bold text-midnight-ink">
          {score}<span className="text-body-sm font-normal text-zinc-500">/100</span>
        </span>
      </div>

      {/* Mini score strip */}
      {aspectScores && Object.values(aspectScores).some(v => v > 0) && (
        <div className="mb-4 flex items-center gap-1">
          {BARS.map((bar) => {
            const pct = Math.round((aspectScores[bar.key] / bar.max) * 100);
            return (
              <div
                key={bar.key}
                className="group relative flex-1"
                title={`${bar.label}: ${aspectScores[bar.key]}/${bar.max}`}
              >
                <div className={`h-2 w-full rounded-sm ${barColor(pct)}`} />
                <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-800 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none z-10">
                  {bar.label} {aspectScores[bar.key]}/{bar.max}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Issues */}
      {issues.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-caption font-medium text-zinc-500">問題点</p>
          <ul className="space-y-1.5">
            {issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2 text-body-sm text-zinc-600 leading-relaxed">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-caption font-medium text-zinc-500">改善提案</p>
          <ul className="space-y-1.5">
            {suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-body-sm text-zinc-600 leading-relaxed">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-teal" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Good example */}
      <div className="rounded-xl border border-mist bg-snow p-4">
        <p className="mb-1.5 text-caption font-medium text-zinc-500">良いコミットメッセージ例</p>
        <p className="font-mono text-body-sm leading-relaxed text-midnight-ink break-words whitespace-pre-wrap">{exampleMessage}</p>
      </div>

      {/* Detail breakdown (click bottom area to toggle) */}
      {aspectScores && Object.values(aspectScores).some(v => v > 0) && (
        <div className="mt-3 cursor-pointer border-t border-mist pt-3" onClick={() => setShowDetails(!showDetails)}>
          {!showDetails ? (
            <div className="flex items-center justify-center gap-1">
              <span className="text-[11px] text-zinc-400">スコア内訳を表示</span>
              <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
            </div>
          ) : (
            <div className="space-y-1.5">
              {BARS.map((bar) => {
                const value = aspectScores[bar.key];
                const pct = Math.round((value / bar.max) * 100);
                return (
                  <div key={bar.key} className="flex items-center gap-2">
                    <span className="w-30 shrink-0 text-right text-[11px] text-zinc-500 whitespace-nowrap">{bar.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-mist">
                      <div className={`h-full rounded-full ${barColor(pct)}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-10 text-right text-[11px] font-medium text-zinc-600">{value}/{bar.max}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {passed && (
        <p className="mt-4 text-center text-body-sm font-semibold text-leaf-soft">
          ✓ 合格（{SCORE.GOOD}点以上）
        </p>
      )}
    </div>
  );
}
