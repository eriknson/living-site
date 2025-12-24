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
      <div className="bg-black/[0.03] dark:bg-white/[0.05] rounded-xl px-3 py-2.5 opacity-50">
        <div className="text-[15px] font-medium text-black/40 dark:text-white/40">{name}</div>
        <div className="text-[13px] text-red-400 mt-1">Build failed</div>
      </div>
    );
  }

  return (
    <div className="bg-black/[0.03] dark:bg-white/[0.05] rounded-xl">
      {/* Desktop layout */}
      <div className="hidden sm:block px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[15px] font-medium text-black/85 dark:text-white/85">{name}</span>
          <div className="flex items-center -mr-1">
            {hasLogs && (
              <button
                onClick={onOpenLogs}
                className="p-1.5 rounded-md text-black/25 dark:text-white/25 hover:text-black/50 dark:hover:text-white/50 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                title="View agent logs"
              >
                <ScrollText className="w-4 h-4" />
              </button>
            )}
            <Link
              href={`/agent?model=${build.model}&date=${date}&t=${encodeURIComponent(batchTimestamp)}`}
              onClick={onViewBuild}
              className="p-1.5 rounded-md text-black/25 dark:text-white/25 hover:text-black/50 dark:hover:text-white/50 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="View this build"
            >
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2.5 mt-1 text-[13px]">
          {duration && (
            <span className="text-black/40 dark:text-white/40">{formatDuration(duration)}</span>
          )}
          {lineCount && (
            <span className="text-green-600 dark:text-green-400 font-medium">+{lineCount}</span>
          )}
        </div>
      </div>

      {/* Mobile layout */}
      <div className="flex sm:hidden overflow-hidden">
        <div className="flex-1 min-w-0 px-3 py-3">
          <div className="text-[15px] font-medium text-black/85 dark:text-white/85 truncate">{name}</div>
          <div className="flex items-center gap-2.5 mt-1 text-[13px]">
            {duration && (
              <span className="text-black/40 dark:text-white/40">{formatDuration(duration)}</span>
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
              className="w-11 h-11 flex items-center justify-center rounded-lg bg-black/[0.03] dark:bg-white/[0.05] text-black/40 dark:text-white/40 active:bg-black/[0.06] dark:active:bg-white/[0.1] transition-colors"
              title="View agent logs"
            >
              <ScrollText className="w-[18px] h-[18px]" />
            </button>
          )}
          <Link
            href={`/agent?model=${build.model}&date=${date}&t=${encodeURIComponent(batchTimestamp)}`}
            onClick={onViewBuild}
            className="w-11 h-11 flex items-center justify-center rounded-lg bg-black/[0.03] dark:bg-white/[0.05] text-black/40 dark:text-white/40 active:bg-black/[0.06] dark:active:bg-white/[0.1] transition-colors"
            title="View this build"
          >
            <ArrowUpRight className="w-[18px] h-[18px]" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function BuildsPageClient({
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
      <div className="min-h-dvh bg-[#fafaf9] dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-[#e5e5e5]">
        <div className="sticky top-0 z-50">
          <GlobalMenuBar currentRoute="/builds" />
        </div>
        <div className="p-6">
          <div className="text-center py-12 text-black/50 dark:text-white/50">
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
    <div className="min-h-dvh bg-[#fafaf9] dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-[#e5e5e5]">
      <div className="sticky top-0 z-50">
        <GlobalMenuBar currentRoute="/builds" />
      </div>
      <div>
        <div className="max-w-[640px] mx-auto px-6 pt-6 pb-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-xl font-semibold text-black/85 dark:text-white/85">
              Build History
            </h1>
            <p className="text-[15px] text-black/50 dark:text-white/50 mt-1">
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
                    <h2 className="text-[15px] font-medium text-black/70 dark:text-white/70">
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
                        className="text-black/25 dark:text-white/25 hover:text-black/50 dark:hover:text-white/50 transition-colors"
                        title="View system prompt"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
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
