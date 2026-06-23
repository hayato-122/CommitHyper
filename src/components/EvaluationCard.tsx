type EvaluationCardProps = {
  score: number;
  issues: string[];
  suggestions: string[];
  exampleMessage: string;
  label?: string;
  passed?: boolean;
};

export function EvaluationCard({
  score,
  issues,
  suggestions,
  exampleMessage,
  label = "評価結果",
  passed,
}: EvaluationCardProps) {
  return (
    <div className="mb-6 rounded-3xl border border-mist bg-white p-5 shadow-subtle">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-body-sm font-semibold text-midnight-ink">
          {label}
        </h2>
        <span className="text-heading-sm font-bold text-midnight-ink">
          {score}
          <span className="text-body-sm font-normal text-zinc-500">
            /100
          </span>
        </span>
      </div>

      {issues.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-caption font-medium text-zinc-500">
            問題点
          </p>
          <ul className="space-y-1.5">
            {issues.map((issue, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-body-sm text-zinc-600 leading-relaxed"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-caption font-medium text-zinc-500">
            改善提案
          </p>
          <ul className="space-y-1.5">
            {suggestions.map((s, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-body-sm text-zinc-600 leading-relaxed"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-teal" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-mist bg-snow p-4">
        <p className="mb-1.5 text-caption font-medium text-zinc-500">
          良いコミットメッセージ例
        </p>
        <p className="font-mono text-body-sm leading-relaxed text-midnight-ink">
          {exampleMessage}
        </p>
      </div>

      {passed && (
        <p className="mt-4 text-center text-body-sm font-semibold text-leaf-soft">
          ✓ 合格（70点以上）
        </p>
      )}
    </div>
  );
}
