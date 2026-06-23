type DiffViewerProps = {
  diff: string | null;
};

export function DiffViewer({ diff }: DiffViewerProps) {
  if (!diff) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-caption text-zinc-400">diffを読み込めませんでした</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto font-mono text-caption leading-relaxed">
      {diff.split("\n").map((line, i) => {
        if (line.startsWith("+") && !line.startsWith("+++")) {
          return (
            <div key={i} className="flex">
              <span className="w-10 shrink-0 select-none bg-green-50 text-right pr-3 text-[10px] leading-5 text-green-400">
                {i + 1}
              </span>
              <span className="flex-1 bg-green-50 px-3 text-green-800 break-all">
                {line}
              </span>
            </div>
          );
        }
        if (line.startsWith("-") && !line.startsWith("---")) {
          return (
            <div key={i} className="flex">
              <span className="w-10 shrink-0 select-none bg-red-50 text-right pr-3 text-[10px] leading-5 text-red-400">
                {i + 1}
              </span>
              <span className="flex-1 bg-red-50 px-3 text-red-800 break-all">
                {line}
              </span>
            </div>
          );
        }
        if (line.startsWith("@@")) {
          return (
            <div key={i} className="flex">
              <span className="w-10 shrink-0 select-none bg-blue-50 text-right pr-3 text-[10px] leading-5 text-blue-300">
                {i + 1}
              </span>
              <span className="flex-1 bg-blue-50 px-3 text-blue-600 font-semibold">
                {line}
              </span>
            </div>
          );
        }
        if (
          line.startsWith("diff --git") ||
          line.startsWith("---") ||
          line.startsWith("+++")
        ) {
          return (
            <div key={i} className="flex bg-pearl/50">
              <span className="w-10 shrink-0 select-none text-right pr-3 text-[10px] leading-5 text-zinc-300">
                {i + 1}
              </span>
              <span className="flex-1 px-3 text-zinc-500 font-medium">
                {line}
              </span>
            </div>
          );
        }
        return (
          <div key={i} className="flex">
            <span className="w-10 shrink-0 select-none text-right pr-3 text-[10px] leading-5 text-zinc-300">
              {i + 1}
            </span>
            <span className="flex-1 px-3 text-zinc-700">{line}</span>
          </div>
        );
      })}
    </div>
  );
}
