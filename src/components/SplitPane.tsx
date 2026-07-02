"use client";

import { useState, useRef, useEffect, type ReactNode, useCallback } from "react";
import { GripVertical } from "lucide-react";

type SplitPaneProps = {
  left: ReactNode;
  right: ReactNode;
  /** デフォルトの割合（左パネルの割合、0.1〜0.9）, default 0.5 */
  defaultRatio?: number;
  /** localStorageのキー（省略可） */
  storageKey?: string;
  /** 最小幅の割合 */
  minRatio?: number;
};

export function SplitPane({
  left,
  right,
  defaultRatio = 0.5,
  storageKey,
  minRatio = 0.2,
}: SplitPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState(() => {
    if (storageKey && typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const n = parseFloat(saved);
        if (n >= 0.1 && n <= 0.9) return n;
      }
    }
    return defaultRatio;
  });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = true;
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const containerEl = containerRef.current;
    if (!containerEl) return;

    function onMove(e: MouseEvent | TouchEvent) {
      if (!dragRef.current || !containerEl) return;
      const rect = containerEl.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const x = clientX - rect.left;
      const newRatio = Math.max(minRatio, Math.min(1 - minRatio, x / rect.width));
      setRatio(newRatio);
    }

    function onUp() {
      dragRef.current = false;
      setDragging(false);
      if (storageKey) {
        setRatio((r) => {
          localStorage.setItem(storageKey, String(r));
          return r;
        });
      }
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [dragging, minRatio, storageKey]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-1 overflow-hidden ${dragging ? "select-none" : ""}`}
    >
      {/* Left panel */}
      <div
        className="flex flex-col overflow-hidden"
        style={{ width: `${ratio * 100}%`, minWidth: `${minRatio * 100}%` }}
      >
        {left}
      </div>

      {/* Divider */}
      <div
        className="flex shrink-0 cursor-col-resize items-center justify-center bg-transparent hover:bg-mist/50 transition-colors"
        style={{ width: 12 }}
        onMouseDown={handleMouseDown}
        onTouchStart={(e) => {
          dragRef.current = true;
          setDragging(true);
        }}
      >
        <div className="flex h-10 items-center justify-center rounded-full bg-mist/80">
          <GripVertical className="h-3.5 w-3.5 text-zinc-400" />
        </div>
      </div>

      {/* Right panel */}
      <div
        className="flex flex-1 flex-col overflow-hidden min-w-0"
      >
        {right}
      </div>
    </div>
  );
}
