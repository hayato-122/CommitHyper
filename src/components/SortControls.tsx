"use client";

import { ArrowUpDown } from "lucide-react";

type SortControlsProps = {
  sortBy: { field: "date" | "score"; direction: "asc" | "desc" };
  onSortChange: (sort: { field: "date" | "score"; direction: "asc" | "desc" }) => void;
};

export function SortControls({ sortBy, onSortChange }: SortControlsProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex overflow-hidden rounded-lg border border-zinc-300">
        <button
          onClick={() => onSortChange({ ...sortBy, field: "score" })}
          className={`px-3 py-1.5 text-xs font-medium transition-all ${
            sortBy.field === "score"
              ? "bg-brand-teal text-white"
              : "bg-white text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          スコア
        </button>
        <button
          onClick={() => onSortChange({ ...sortBy, field: "date" })}
          className={`px-3 py-1.5 text-xs font-medium transition-all ${
            sortBy.field === "date"
              ? "bg-brand-teal text-white"
              : "bg-white text-zinc-600 hover:bg-zinc-50"
          }`}
        >
          日付
        </button>
      </div>
      <button
        onClick={() =>
          onSortChange({
            ...sortBy,
            direction: sortBy.direction === "asc" ? "desc" : "asc",
          })
        }
        className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50"
      >
        <ArrowUpDown className="mr-1 inline h-3 w-3" />
        {sortBy.direction === "asc" ? "昇順" : "降順"}
      </button>
    </div>
  );
}
