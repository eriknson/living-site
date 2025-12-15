"use client";

import { useEffect, useRef } from "react";
import type { BuildState } from "@/lib/build-types";
import { getLineType } from "@/lib/build-types";

interface TerminalViewProps {
  state: BuildState | null;
  onStart?: () => void;
  isStarting?: boolean;
}

export function TerminalView({ state, onStart, isStarting }: TerminalViewProps) {
  const isIdle = !state && !isStarting;
  const showModelPanes = state?.workflow.aggregate === "complete";
  const models = ["composer-1", "claude-4.5-opus-high-thinking", "gpt-5.1-codex", "gemini-3-pro"];

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 font-mono text-xs p-4 pt-[calc(var(--menu-bar-height)+1rem)]">
      {isIdle ? (
        <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
          <div className="text-center">
            <p className="text-neutral-500 mb-4">Ready to start a new build</p>
            <button
              onClick={onStart}
              disabled={isStarting}
              className="px-4 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs rounded hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              {isStarting ? "$ starting..." : "$ npm run regenerate"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Aggregate pane */}
          <TerminalPane
            title="aggregate"
            lines={state?.aggregateLog || []}
            status={state?.workflow.aggregate || "pending"}
          />

          {/* Model panes - appear after aggregate completes */}
          {showModelPanes && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {models.map((model) => (
                <TerminalPane
                  key={model}
                  title={shortenModelName(model)}
                  lines={state?.models[model]?.rawLog || []}
                  status={state?.models[model]?.status || "queued"}
                  phase={state?.models[model]?.phase}
                />
              ))}
            </div>
          )}

          {/* Commit status */}
          {state?.workflow.commit !== "pending" && (
            <div className="border border-neutral-200 dark:border-neutral-700 rounded-md overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                <StatusDot status={state?.workflow.commit || "pending"} />
                <span className="text-neutral-500">commit</span>
              </div>
              <div className="p-3 h-20 overflow-y-auto">
                {state?.workflow.commit === "running" && (
                  <span className="text-neutral-500">Committing changes...</span>
                )}
                {state?.workflow.commit === "complete" && (
                  <span className="text-green-600 dark:text-green-400">✓ Changes committed and deployed</span>
                )}
                {state?.workflow.commit === "error" && (
                  <span className="text-red-600 dark:text-red-400">✗ Commit failed</span>
                )}
              </div>
            </div>
          )}

          {/* Final status */}
          {state?.status === "complete" && (
            <div className="text-center py-4">
              <span className="text-green-600 dark:text-green-400">Build complete!</span>
              <a
                href="/"
                className="ml-4 text-blue-600 dark:text-blue-400 hover:underline"
              >
                View site →
              </a>
            </div>
          )}

          {state?.status === "error" && (
            <div className="text-center py-4">
              <span className="text-red-600 dark:text-red-400">Build failed: {state.error}</span>
              <button
                onClick={onStart}
                className="ml-4 text-blue-600 dark:text-blue-400 hover:underline"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TerminalPane({
  title,
  lines,
  status,
  phase,
}: {
  title: string;
  lines: string[];
  status: "pending" | "queued" | "running" | "complete" | "error";
  phase?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new lines appear
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  return (
    <div className="border border-neutral-200 dark:border-neutral-700 rounded-md overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          <StatusDot status={status} />
          <span className="text-neutral-500">{title}</span>
        </div>
        {phase && status === "running" && (
          <span className="text-neutral-400 text-[10px]">{phase}</span>
        )}
      </div>

      {/* Terminal content */}
      <div
        ref={scrollRef}
        className="p-3 h-64 overflow-y-auto bg-white dark:bg-neutral-900"
      >
        {status === "queued" && (
          <span className="text-neutral-400">Waiting...</span>
        )}
        {lines.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap leading-relaxed">
            <TerminalLine line={line} />
          </div>
        ))}
        {/* Blinking cursor if running */}
        {status === "running" && (
          <span className="inline-block w-2 h-3.5 bg-neutral-800 dark:bg-neutral-200 animate-pulse" />
        )}
      </div>
    </div>
  );
}

function TerminalLine({ line }: { line: string }) {
  const type = getLineType(line);

  const colorClass = {
    read: "text-blue-600 dark:text-blue-400",
    write: "text-green-600 dark:text-green-400",
    agent: "text-purple-600 dark:text-purple-400",
    success: "text-green-600 dark:text-green-400",
    error: "text-red-600 dark:text-red-400",
    default: "text-neutral-700 dark:text-neutral-300",
  }[type];

  return <span className={colorClass}>{line}</span>;
}

function StatusDot({ status }: { status: string }) {
  const colorClass = {
    pending: "bg-neutral-300",
    queued: "bg-neutral-300",
    running: "bg-amber-500 animate-pulse",
    complete: "bg-green-500",
    error: "bg-red-500",
  }[status] || "bg-neutral-300";

  return <span className={`w-2 h-2 rounded-full ${colorClass}`} />;
}

function shortenModelName(model: string): string {
  const map: Record<string, string> = {
    "composer-1": "composer-1",
    "claude-4.5-opus-high-thinking": "claude-4.5",
    "gpt-5.1-codex": "gpt-5.1",
    "gemini-3-pro": "gemini-3-pro",
  };
  return map[model] || model;
}

