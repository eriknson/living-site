export interface Build {
  model: string;
  status: string;
  duration_ms?: number;
  line_count?: number;
  path: string;
}

export interface Batch {
  timestamp: string; // ISO timestamp, used as unique identifier
  github_run_url?: string;
  system_prompt?: string; // The system prompt used for this build batch
  builds: Build[];
}

export interface DateEntry {
  date: string;
  batches: Batch[];
}

export interface Manifest {
  default_model: string;
  models: string[];
  latest_date: string;
  latest_timestamp: string; // ISO timestamp of the most recent batch
  dates: DateEntry[];
}

// Model display names (short labels for known model IDs)
export const modelDisplayNames: Record<string, string> = {
  "composer-1.5": "Composer 1.5",
  "claude-4.6-opus-max-thinking": "Opus 4.6 Max",
  "gpt-5.3-codex-xhigh": "GPT-5.3 XHigh",
  "gemini-3.1-pro": "Gemini 3.1 Pro",
  "composer-1": "Composer 1",
  "claude-4.5-opus-high-thinking": "Opus 4.5",
  "gpt-5.1-codex": "GPT-5.1",
  "gemini-3-pro": "Gemini 3",
};

// URL-friendly slugs
export const modelSlugs: Record<string, string> = {
  "composer-1.5": "composer-1.5",
  "claude-4.6-opus-max-thinking": "opus-4.6-max",
  "gpt-5.3-codex-xhigh": "gpt-5.3-codex-xhigh",
  "gemini-3.1-pro": "gemini-3.1-pro",
  "composer-1": "composer-1",
  "claude-4.5-opus-high-thinking": "opus-4.5",
  "gpt-5.1-codex": "gpt-5.1-codex",
  "gemini-3-pro": "gemini-3-pro",
};

// Reverse mapping from slug to model ID
export const slugToModelId: Record<string, string> = Object.entries(
  modelSlugs
).reduce(
  (acc, [modelId, slug]) => {
    acc[slug] = modelId;
    return acc;
  },
  {} as Record<string, string>
);

export function getModelDisplayName(modelId: string): string {
  return modelDisplayNames[modelId] || modelId;
}

export function getModelSlug(modelId: string): string {
  return modelSlugs[modelId] || modelId;
}

export function getModelIdFromSlug(slug: string): string | undefined {
  return slugToModelId[slug] || slug;
}

export function formatDuration(ms?: number): string {
  if (!ms) return "";
  if (ms < 60000) {
    return `${Math.round(ms / 1000)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  return `${diffDays}d ago`;
}

// Get a specific batch by date and timestamp
export function getBatch(
  manifest: Manifest,
  date?: string,
  timestamp?: string
): Batch | undefined {
  const targetDate = date || manifest.latest_date;
  const dateEntry = manifest.dates.find((d) => d.date === targetDate);
  if (!dateEntry || dateEntry.batches.length === 0) return undefined;

  if (timestamp) {
    return dateEntry.batches.find((b) => b.timestamp === timestamp);
  }
  // Return most recent batch for this date
  return dateEntry.batches[0];
}

// Get build for a model within a specific batch
export function getBuildForModel(
  manifest: Manifest,
  modelId: string,
  date?: string,
  timestamp?: string
): Build | undefined {
  const batch = getBatch(manifest, date, timestamp);
  if (!batch) return undefined;

  return batch.builds.find(
    (b) => b.model === modelId && b.status === "success"
  );
}

// Get all successful builds from a batch
export function getAvailableModels(
  manifest: Manifest,
  date?: string,
  timestamp?: string
): Build[] {
  const batch = getBatch(manifest, date, timestamp);
  if (!batch) return [];

  return batch.builds.filter((b) => b.status === "success");
}

// Alias for getAvailableModels (all builds in a batch are from the same batch)
export function getSameBatchModels(
  manifest: Manifest,
  date?: string,
  timestamp?: string
): Build[] {
  return getAvailableModels(manifest, date, timestamp);
}

// Get the timestamp for a batch
export function getBuiltAt(
  manifest: Manifest,
  date?: string,
  timestamp?: string
): string | undefined {
  const batch = getBatch(manifest, date, timestamp);
  return batch?.timestamp;
}

// Get all batches for a date
export function getBatchesForDate(
  manifest: Manifest,
  date?: string
): Batch[] {
  const targetDate = date || manifest.latest_date;
  const dateEntry = manifest.dates.find((d) => d.date === targetDate);
  return dateEntry?.batches || [];
}

