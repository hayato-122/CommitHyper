"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AnalyzeState = {
  phase: "fetch" | "rule" | "ai";
  current: number;
  total: number;
  message: string;
  currentMessage?: string;
  score?: number;
  estimatedSecondsRemaining?: number;
  initialAvg?: number;
  rpdExceeded?: boolean;
  rpdMessage?: string;
};

export function useSSEAnalysis() {
  const [analyzeState, setAnalyzeState] = useState<AnalyzeState | null>(null);
  const evtSourceRef = useRef<EventSource | null>(null);

  const stopAnalysis = useCallback(() => {
    if (evtSourceRef.current) {
      evtSourceRef.current.close();
      evtSourceRef.current = null;
    }
  }, []);

  const startAnalysis = useCallback(
    (url: string, callbacks: {
      onRuleComplete?: (data: Record<string, unknown>) => void;
      onAIComplete?: (data: Record<string, unknown>) => void;
      onError?: () => void;
      onRpdExceeded?: (data: Record<string, unknown>) => void;
    }) => {
      stopAnalysis();

      setAnalyzeState({
        phase: "fetch",
        current: 0,
        total: 0,
        message: "GitHubからコミットを取得中...",
      });

      const evtSource = new EventSource(url);
      evtSourceRef.current = evtSource;

      evtSource.addEventListener("progress", (e) => {
        const data = JSON.parse(e.data);
        if (data.phase === "fetch_done") {
          setAnalyzeState((prev) => ({
            ...prev!,
            phase: "rule",
            current: 0,
            total: data.total,
            message: data.message,
          }));
        }
      });

      evtSource.addEventListener("phase", (e) => {
        const data = JSON.parse(e.data);
        setAnalyzeState((prev) => ({
          ...prev!,
          phase: data.name === "rule" ? "rule" : "ai",
          message: data.message,
        }));
      });

      evtSource.addEventListener("rule_complete", (e) => {
        const data = JSON.parse(e.data);
        setAnalyzeState((prev) => ({
          ...prev!,
          phase: "ai",
          current: 0,
          total: data.totalCount,
          message: "AIで詳細評価中...",
          estimatedSecondsRemaining: data.estimatedAiSeconds,
          initialAvg: data.initialAvg,
        }));
        callbacks.onRuleComplete?.(data);
      });

      evtSource.addEventListener("ai_progress", (e) => {
        const data = JSON.parse(e.data);
        setAnalyzeState((prev) => ({
          ...prev!,
          current: data.current,
          total: data.total,
          currentMessage: data.currentMessage,
          score: data.score,
          estimatedSecondsRemaining: data.estimatedSecondsRemaining,
        }));
      });

      evtSource.addEventListener("rpd_exceeded", (e) => {
        const data = JSON.parse(e.data);
        setAnalyzeState((prev) => (prev ? { ...prev, rpdExceeded: true, rpdMessage: data.message } : null));
        callbacks.onRpdExceeded?.(data);
      });

      evtSource.addEventListener("ai_complete", (e) => {
        const data = JSON.parse(e.data);
        setAnalyzeState(null);
        evtSource.close();
        evtSourceRef.current = null;
        callbacks.onAIComplete?.(data);
      });

      evtSource.addEventListener("cancelled", (e) => {
        const data = JSON.parse(e.data);
        setAnalyzeState(null);
        evtSource.close();
        evtSourceRef.current = null;
        if (data.commits) {
          callbacks.onRuleComplete?.(data);
        }
        callbacks.onAIComplete?.(data);
      });

      evtSource.addEventListener("error", () => {
        setAnalyzeState(null);
        evtSource.close();
        evtSourceRef.current = null;
        callbacks.onError?.();
      });
    },
    [stopAnalysis],
  );

  useEffect(() => {
    return () => {
      stopAnalysis();
    };
  }, [stopAnalysis]);

  return { analyzeState, startAnalysis, stopAnalysis };
}
