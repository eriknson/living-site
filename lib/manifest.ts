export interface Build {
  model: string;
  status: string;
  duration_ms?: number;
  path: string;
}

export interface DateEntry {
  date: string;
  built_at?: string; // ISO timestamp of when this batch was built
  builds: Build[];
}

export interface Manifest {
  default_model: string;
  models: string[];
  latest_date: string;
  dates: DateEntry[];
}

// Model display names
export const modelDisplayNames: Record<string, string> = {
  "composer-1": "Composer 1",
  "claude-4.5-opus-high-thinking": "Opus 4.5",
  "gpt-5.1-codex": "GPT-5.1 Codex",
  "gpt-5.1-codex-max-low-fast": "GPT-5.1 Codex Max",
};

// URL-friendly slugs
export const modelSlugs: Record<string, string> = {
  "composer-1": "composer-1",
  "claude-4.5-opus-high-thinking": "opus-4.5",
  "gpt-5.1-codex": "gpt-5.1-codex",
  "gpt-5.1-codex-max-low-fast": "gpt-5.1-codex-max",
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

export function getBuildForModel(
  manifest: Manifest,
  modelId: string,
  date?: string
): Build | undefined {
  const targetDate = date || manifest.latest_date;
  const dateEntry = manifest.dates.find((d) => d.date === targetDate);
  if (!dateEntry) return undefined;

  return dateEntry.builds.find(
    (b) => b.model === modelId && b.status === "success"
  );
}

export function getAvailableModels(
  manifest: Manifest,
  date?: string
): Build[] {
  const targetDate = date || manifest.latest_date;
  const dateEntry = manifest.dates.find((d) => d.date === targetDate);
  if (!dateEntry) return [];

  return dateEntry.builds.filter((b) => b.status === "success");
}

// Get only models built in the same batch (have duration_ms)
export function getSameBatchModels(
  manifest: Manifest,
  date?: string
): Build[] {
  const targetDate = date || manifest.latest_date;
  const dateEntry = manifest.dates.find((d) => d.date === targetDate);
  if (!dateEntry) return [];

  // Only return builds that have duration_ms (indicating they were built in this batch)
  return dateEntry.builds.filter((b) => b.status === "success" && b.duration_ms !== undefined);
}

// Get the built_at timestamp for a date entry
export function getBuiltAt(manifest: Manifest, date?: string): string | undefined {
  const targetDate = date || manifest.latest_date;
  const dateEntry = manifest.dates.find((d) => d.date === targetDate);
  return dateEntry?.built_at;
}

