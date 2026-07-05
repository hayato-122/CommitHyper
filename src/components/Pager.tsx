"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

type PagerProps = {
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
};

export function Pager({ page, totalPages, totalCount, onPageChange }: PagerProps) {
  if (totalCount === 0) return null;

  const start = (page - 1) * 3 + 1;
  const end = Math.min(page * 3, totalCount);

  function goNext() {
    onPageChange(page >= totalPages ? 1 : page + 1);
  }

  function goPrev() {
    onPageChange(page <= 1 ? totalPages : page - 1);
  }

  return (
    <div className="mt-auto flex items-center justify-center gap-1 pt-6">
      {/* First page */}
      <button
        onClick={() => onPageChange(1)}
        disabled={page <= 1}
        className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm text-zinc-500 hover:bg-zinc-50 disabled:opacity-30"
      >
        <ChevronsLeft className="h-3.5 w-3.5" />
      </button>

      {/* Previous */}
      <button
        onClick={goPrev}
        className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>

      {/* Page indicator */}
      <span className="mx-3 w-12 text-center text-sm font-medium tabular-nums text-zinc-600">
        {String(page).padStart(2, "0")}
        <span className="text-zinc-400"> / </span>
        {String(totalPages).padStart(2, "0")}
      </span>

      {/* Next */}
      <button
        onClick={goNext}
        className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>

      {/* Last page */}
      <button
        onClick={() => onPageChange(totalPages)}
        disabled={page >= totalPages}
        className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm text-zinc-500 hover:bg-zinc-50 disabled:opacity-30"
      >
        <ChevronsRight className="h-3.5 w-3.5" />
      </button>

      {/* Range info */}
      <span className="ml-4 hidden md:inline w-28 text-xs tabular-nums text-zinc-400">
        {start}〜{end} / 全{totalCount}件
      </span>
    </div>
  );
}
