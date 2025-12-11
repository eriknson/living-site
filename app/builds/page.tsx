"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown, ExternalLink } from "lucide-react";

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

interface ManifestBuild {
  model: string;
  status: string;
  duration_ms?: number;
  path: string;
}

interface ManifestDate {
  date: string;
  built_at?: string;
  builds: ManifestBuild[];
}

interface Manifest {
  default_model: string;
  models: string[];
  latest_date: string | null;
  dates: ManifestDate[];
}

const modelNames: Record<string, string> = {
  "composer-1": "Composer",
  "claude-4.5-opus-high-thinking": "Opus 4.5",
  "gpt-5.1-codex": "GPT-5.1 Codex",
  "gpt-5.1-codex-max-low-fast": "GPT-5.1 Max",
};

function formatBuildTime(builtAt?: string): string {
  if (!builtAt) return "";
  
  const date = new Date(builtAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // Check if same day
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) {
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${diffHours}h ago`;
  }
  
  if (isYesterday) {
    return `Yesterday at ${timeStr}`;
  }
  
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
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


export default function BuildsPage() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [history, setHistory] = useState<BuildHistory | null>(null);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/builds/manifest.json").then((r) => r.json()),
      fetch("/builds/history.json").then((r) => r.json()),
    ])
      .then(([m, h]) => {
        setManifest(m);
        setHistory(h);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Group history logs by date and model
  const logsByDateModel: Record<string, BuildEntry> = {};
  for (const build of history?.builds || []) {
    const date = build.timestamp.split("T")[0];
    const model = build.model || "unknown";
    const key = `${date}-${model}`;
    if (!logsByDateModel[key]) {
      logsByDateModel[key] = build;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center text-neutral-500">
        Loading...
      </div>
    );
  }

  if (!manifest?.dates?.length) {
    return (
      <div className="min-h-screen bg-neutral-50 p-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="text-center py-12 text-neutral-500">
          No builds yet. The site regenerates daily with multiple AI models.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="text-xl font-semibold text-neutral-900">
            Build History
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Daily builds from multiple AI models
          </p>
        </div>

        {/* Date groups */}
        <div className="space-y-4">
          {manifest.dates.map((dateEntry) => {
            const date = dateEntry.date;
            // Only show builds for models in the active models list
            const builds = (dateEntry.builds || []).filter(
              (b) => manifest.models.includes(b.model)
            );
            const isExpanded = expandedDate === date;

            // Get the first log entry to get github_run_url (shared across models)
            const firstLog = logsByDateModel[`${date}-${builds[0]?.model}`];
            const githubRunUrl = firstLog?.github_run_url;

            return (
              <div
                key={date}
                className="bg-white rounded-xl border border-neutral-200 overflow-hidden"
              >
                {/* Date header */}
                <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
                  <span className="font-medium text-neutral-900">
                    {formatBuildTime(dateEntry.built_at)}
                  </span>
                  {githubRunUrl && (
                    <a
                      href={githubRunUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-neutral-400 hover:text-neutral-600 p-1"
                      title="View GitHub Actions run"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>

                {/* Model builds */}
                <div className="p-3 grid gap-2 sm:grid-cols-3">
                  {builds.map((build) => {
                    const name = modelNames[build.model] || build.model;
                    const isFailed = build.status !== "success";
                    const log = logsByDateModel[`${date}-${build.model}`];

                    if (isFailed) {
                      return (
                        <div
                          key={build.model}
                          className="px-3 py-2.5 rounded-lg bg-neutral-50 opacity-50"
                        >
                          <div className="text-sm font-medium text-neutral-500">
                            {name}
                          </div>
                          <div className="text-xs text-red-500 mt-0.5">
                            failed
                          </div>
                        </div>
                      );
                    }

                      return (
                        <Link
                          key={build.model}
                          href={`/?model=${build.model}&date=${date}`}
                          className="px-3 py-2.5 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors"
                        >
                          <div className="text-sm font-medium text-neutral-900">
                            {name}
                          </div>
                          <div className="flex items-center gap-2 text-xs mt-0.5">
                            {build.duration_ms && (
                              <span className="text-neutral-400">{formatDuration(build.duration_ms)}</span>
                            )}
                            {log?.line_count && (
                              <span className="text-green-600 font-medium">+{log.line_count}</span>
                            )}
                          </div>
                        </Link>
                      );
                  })}
                </div>

                {/* Agent logs toggle */}
                {builds.some(
                  (b) => logsByDateModel[`${date}-${b.model}`]?.agent_output
                ) && (
                  <>
                    <button
                      onClick={() =>
                        setExpandedDate(isExpanded ? null : date)
                      }
                      className="w-full px-4 py-2.5 border-t border-neutral-100 flex items-center justify-between text-sm text-neutral-500 hover:bg-neutral-50 transition-colors"
                    >
                      <span>Agent logs</span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="border-t border-neutral-100 p-4 space-y-4">
                        {builds.map((build) => {
                          const log = logsByDateModel[`${date}-${build.model}`];
                          if (!log?.agent_output) return null;

                          const name = modelNames[build.model] || build.model;

                          return (
                            <div key={build.model}>
                              <div className="text-sm font-medium text-neutral-700 mb-2">
                                {name}
                              </div>
                              <pre className="bg-neutral-900 text-neutral-300 text-xs p-3 rounded-lg overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap break-words font-mono leading-relaxed">
                                {log.agent_output}
                              </pre>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
