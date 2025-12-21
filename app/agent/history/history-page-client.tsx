"use client";

import { useState } from "react";
import { track } from "@vercel/analytics";
import Link from "next/link";
import { ArrowUpRight, ScrollText, FileText } from "lucide-react";
import type { Manifest, Batch, Build } from "@/lib/manifest";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { GlobalMenuBar } from "@/components/global-menu-bar";

interface BuildEntry {
  id: string;
  timestamp: string;
  formatted_timestamp: string;
  status: "success" | "failure";
  duration_ms?: number;
  model?: string;
  agent_output: string;
  token_count?: number;
  line_count?: number;
  github_run_url?: string;
}

interface BuildHistory {
  builds: BuildEntry[];
}

const modelNames: Record<string, string> = {
  "composer-1": "Composer",
  "claude-4.5-opus-high-thinking": "Opus 4.5",
  "gpt-5.1-codex": "GPT-5.1 Codex",
  "gpt-5.1-codex-max-low-fast": "GPT-5.1 Max",
  "gemini-3-pro": "Gemini 3 Pro",
};

function formatBuildTime(timestamp?: string): string {
  if (!timestamp) return "";

  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";

  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${dateStr} at ${timeStr}`;
}

function formatDuration(ms?: number): string {
  if (!ms) return "";
  const seconds = ms / 1000;
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
}

// GitHub icon component
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

// Model card component with icon actions
function ModelCard({
  build,
  log,
  date,
  batchTimestamp,
  onOpenLogs,
  onViewBuild,
}: {
  build: Build;
  log?: BuildEntry;
  date: string;
  batchTimestamp: string;
  onOpenLogs: () => void;
  onViewBuild: () => void;
}) {
  const name = modelNames[build.model] || build.model;
  const isFailed = build.status !== "success";
  const hasLogs = !!log?.agent_output;
  const duration = build.duration_ms || log?.duration_ms;
  const lineCount = build.line_count || log?.line_count;

  if (isFailed) {
    return (
      <div className="bg-white dark:bg-neutral-800 rounded-xl px-3 py-2.5 opacity-50">
        <div className="text-sm font-medium text-neutral-400">{name}</div>
        <div className="text-xs text-red-400 mt-1">Build failed</div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl">
      {/* Desktop layout */}
      <div className="hidden sm:block px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{name}</span>
          <div className="flex items-center -mr-1">
            {hasLogs && (
              <button
                onClick={onOpenLogs}
                className="p-1.5 rounded-md text-neutral-300 dark:text-neutral-500 hover:text-neutral-500 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                title="View agent logs"
              >
                <ScrollText className="w-4 h-4" />
              </button>
            )}
            <Link
              href={`/agent?model=${build.model}&date=${date}&t=${encodeURIComponent(batchTimestamp)}`}
              onClick={onViewBuild}
              className="p-1.5 rounded-md text-neutral-300 dark:text-neutral-500 hover:text-neutral-500 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              title="View this build"
            >
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2.5 mt-1 text-xs">
          {duration && (
            <span className="text-neutral-400">{formatDuration(duration)}</span>
          )}
          {lineCount && (
            <span className="text-green-600 dark:text-green-400 font-medium">+{lineCount}</span>
          )}
        </div>
      </div>

      {/* Mobile layout */}
      <div className="flex sm:hidden overflow-hidden">
        <div className="flex-1 min-w-0 px-3 py-3">
          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">{name}</div>
          <div className="flex items-center gap-2.5 mt-1 text-xs">
            {duration && (
              <span className="text-neutral-400">{formatDuration(duration)}</span>
            )}
            {lineCount && (
              <span className="text-green-600 dark:text-green-400 font-medium">+{lineCount}</span>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 flex items-center gap-2 p-2">
          {hasLogs && (
            <button
              onClick={onOpenLogs}
              className="w-11 h-11 flex items-center justify-center rounded bg-neutral-50 dark:bg-neutral-700 text-neutral-400 active:bg-neutral-100 dark:active:bg-neutral-600 transition-colors"
              title="View agent logs"
            >
              <ScrollText className="w-[18px] h-[18px]" />
            </button>
          )}
          <Link
            href={`/agent?model=${build.model}&date=${date}&t=${encodeURIComponent(batchTimestamp)}`}
            onClick={onViewBuild}
            className="w-11 h-11 flex items-center justify-center rounded bg-neutral-50 dark:bg-neutral-700 text-neutral-400 active:bg-neutral-100 dark:active:bg-neutral-600 transition-colors"
            title="View this build"
          >
            <ArrowUpRight className="w-[18px] h-[18px]" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function HistoryPageClient({
  manifest,
  history,
}: {
  manifest: Manifest | null;
  history: BuildHistory | null;
}) {
  const [activeLog, setActiveLog] = useState<{
    modelName: string;
    output: string;
    timestamp: string;
  } | null>(null);

  const [activePrompt, setActivePrompt] = useState<{
    content: string;
    timestamp: string;
  } | null>(null);

  // Group history logs by timestamp and model for lookup
  const logsByTimestampModel: Record<string, BuildEntry> = {};
  for (const build of history?.builds || []) {
    const model = build.model || "unknown";
    const key = `${build.timestamp}-${model}`;
    if (!logsByTimestampModel[key]) {
      logsByTimestampModel[key] = build;
    }
  }

  if (!manifest?.dates?.length) {
    return (
      <div className="h-full overflow-auto bg-neutral-100 dark:bg-neutral-900">
        <GlobalMenuBar currentRoute="/agent" />
        <div className="pt-[var(--menu-bar-height)] p-6">
          <div className="text-center py-12 text-neutral-500">
            No builds yet. The site regenerates daily with multiple AI models.
          </div>
        </div>
      </div>
    );
  }

  // Flatten all batches across all dates for display
  const allBatches: { date: string; batch: Batch }[] = [];
  for (const dateEntry of manifest.dates) {
    for (const batch of dateEntry.batches) {
      allBatches.push({ date: dateEntry.date, batch });
    }
  }

  return (
    <div className="h-full overflow-auto bg-neutral-100 dark:bg-neutral-900">
      <GlobalMenuBar currentRoute="/agent" />
      <div className="pt-[var(--menu-bar-height)]">
        <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              Build History
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              Browse and compare model outputs
            </p>
          </div>

          {/* Build sessions list */}
          <div className="space-y-6">
            {allBatches.map(({ date, batch }) => {
              const builds = batch.builds.filter((b) =>
                manifest.models.includes(b.model)
              );

              if (builds.length === 0) return null;

              const batchKey = `${date}-${batch.timestamp}`;

              return (
                <section key={batchKey}>
                  {/* Session header with prompt and GitHub icons */}
                  <div className="flex items-center gap-2 mb-2.5 px-1">
                    <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                      {formatBuildTime(batch.timestamp)}
                    </h2>
                    {batch.system_prompt && (
                      <button
                        onClick={() => {
                          track("system_prompt_opened");
                          setActivePrompt({
                            content: batch.system_prompt!,
                            timestamp: batch.timestamp,
                          });
                        }}
                        className="text-neutral-300 dark:text-neutral-500 hover:text-neutral-500 dark:hover:text-neutral-300 transition-colors"
                        title="View system prompt"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    )}
                    {batch.github_run_url && (
                      <a
                        href={batch.github_run_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => track("github_run_clicked")}
                        className="text-neutral-300 dark:text-neutral-500 hover:text-neutral-500 dark:hover:text-neutral-300 transition-colors"
                        title="View GitHub Actions run"
                      >
                        <GitHubIcon className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {/* Model cards grid */}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {builds.map((build: Build) => {
                      const log =
                        logsByTimestampModel[`${batch.timestamp}-${build.model}`];
                      const modelName = modelNames[build.model] || build.model;

                      return (
                        <ModelCard
                          key={build.model}
                          build={build}
                          log={log}
                          date={date}
                          batchTimestamp={batch.timestamp}
                          onOpenLogs={() => {
                            track("agent_logs_opened", { model: build.model });
                            setActiveLog({
                              modelName,
                              output: log?.agent_output || "",
                              timestamp: batch.timestamp,
                            });
                          }}
                          onViewBuild={() => track("build_viewed", { model: build.model, date })}
                        />
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>

      {/* Agent logs drawer */}
      {activeLog && (
        <Drawer open onOpenChange={(open) => !open && setActiveLog(null)}>
          <DrawerContent className="max-h-[85vh]" aria-label="Agent logs">
            <DrawerHeader className="text-left px-5">
              <DrawerTitle>{activeLog.modelName}</DrawerTitle>
              <DrawerDescription>
                Agent logs from {formatBuildTime(activeLog.timestamp)}
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6 overflow-auto">
              <pre className="bg-neutral-900 text-neutral-300 text-xs p-4 rounded-xl overflow-x-auto whitespace-pre-wrap break-words font-mono leading-relaxed">
                {activeLog.output}
              </pre>
            </div>
          </DrawerContent>
        </Drawer>
      )}

      {/* System prompt drawer */}
      {activePrompt && (
        <Drawer open onOpenChange={(open) => !open && setActivePrompt(null)}>
          <DrawerContent className="max-h-[85vh]" aria-label="System prompt">
            <DrawerHeader className="text-left px-5">
              <DrawerTitle>System Prompt</DrawerTitle>
              <DrawerDescription>
                Prompt used for build at {formatBuildTime(activePrompt.timestamp)}
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6 overflow-auto">
              <pre className="bg-neutral-900 text-neutral-300 text-xs p-4 rounded-xl overflow-x-auto whitespace-pre-wrap break-words font-mono leading-relaxed">
                {activePrompt.content}
              </pre>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
