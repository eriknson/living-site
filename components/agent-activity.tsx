"use client";

import { useEffect, useRef } from "react";

export type AgentActivityKind = "status" | "thinking" | "assistant" | "tool" | "task";
export type AgentActivityStatus = "running" | "completed" | "error";

export interface AgentActivityItem {
  id: string;
  kind: AgentActivityKind;
  status: AgentActivityStatus;
  action: string;
  details?: string;
  toolName?: string;
  timestamp: number;
}

interface AgentActivityRowProps {
  item: AgentActivityItem;
  isCurrent: boolean;
}

/**
 * One row of the agent buffer. The current running row uses the shine
 * effect; everything else fades to muted. No leading glyph — the typography
 * itself signals state (shimmer / muted / red).
 */
export function AgentActivityRow({ item, isCurrent }: AgentActivityRowProps) {
  const isRunning = item.status === "running";
  const isError = item.status === "error";
  const showShine = isCurrent && isRunning;

  const actionClass = [
    "text-[13px] leading-5 truncate",
    showShine
      ? "agent-shine text-gray-900 dark:text-gray-100"
      : isError
        ? "text-red-500/80"
        : isCurrent
          ? "text-gray-800 dark:text-gray-200"
          : "text-gray-400 dark:text-gray-500",
  ]
    .filter(Boolean)
    .join(" ");

  const detailsClass = [
    "text-[13px] leading-5 tabular-nums truncate",
    isCurrent
      ? "text-gray-500 dark:text-gray-400"
      : "text-gray-400/70 dark:text-gray-500/70",
  ].join(" ");

  return (
    <div className="flex items-center gap-2 py-1 min-w-0">
      <span className={actionClass}>{item.action}</span>
      {item.details ? <span className={detailsClass}>{item.details}</span> : null}
    </div>
  );
}

interface AgentActivityPanelProps {
  items: AgentActivityItem[];
  fallbackMessage?: string;
  elapsedSeconds: number;
}

/**
 * Full-card activity panel shown before the first partial HTML arrives.
 */
export function AgentActivityPanel({
  items,
  fallbackMessage,
  elapsedSeconds,
}: AgentActivityPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastRunningId = [...items].reverse().find(i => i.status === "running")?.id;

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [items.length]);

  const hasItems = items.length > 0;

  return (
    <div className="flex-1 mx-4 my-4 bg-white dark:bg-white/5 rounded-xl shadow-sm border border-black/5 dark:border-white/10 flex flex-col overflow-hidden">
      <div ref={containerRef} className="flex-1 overflow-y-auto px-5 py-5">
        <div className="flex flex-col">
          {hasItems ? (
            items.map(item => (
              <AgentActivityRow
                key={item.id}
                item={item}
                isCurrent={item.id === lastRunningId}
              />
            ))
          ) : (
            <div className="flex items-center gap-2 py-1 min-w-0">
              <span className="text-[13px] leading-5 agent-shine text-gray-900 dark:text-gray-100">
                {fallbackMessage || "Planning next moves"}
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="px-5 py-2.5 border-t border-black/5 dark:border-white/10 flex items-center justify-between">
        <span className="text-[12px] text-gray-400 dark:text-gray-500 tabular-nums">
          {elapsedSeconds}s elapsed
        </span>
        <span className="text-[12px] text-gray-400 dark:text-gray-500">
          Cursor cloud agent
        </span>
      </div>
    </div>
  );
}

interface AgentActivityOverlayProps {
  current?: AgentActivityItem;
  elapsedSeconds: number;
}

/**
 * Floating pill rendered over the live preview while the agent is still
 * working. Shows the current activity action + details + elapsed time.
 */
export function AgentActivityOverlay({
  current,
  elapsedSeconds,
}: AgentActivityOverlayProps) {
  const isError = current?.status === "error";
  const showShine = current?.status === "running";
  const action = current?.action || "Working";
  const details = current?.details;

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-[90vw]">
      <div className="bg-white/90 dark:bg-black/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-black/5 dark:border-white/10 flex items-center gap-2 min-w-0">
        <span
          className={[
            "text-[13px] truncate max-w-[220px]",
            showShine
              ? "agent-shine text-gray-900 dark:text-gray-100"
              : isError
                ? "text-red-500/80"
                : "text-gray-700 dark:text-gray-300",
          ].join(" ")}
        >
          {action}
        </span>
        {details ? (
          <span className="text-[13px] text-gray-400 dark:text-gray-500 truncate max-w-[160px] tabular-nums">
            {details}
          </span>
        ) : null}
        <span className="text-[12px] text-gray-400 dark:text-gray-500 tabular-nums pl-1">
          {elapsedSeconds}s
        </span>
      </div>
    </div>
  );
}
