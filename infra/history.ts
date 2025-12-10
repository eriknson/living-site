/**
 * History Manager
 * Generic module for storing and querying weekly snapshots of any data source
 */

import { readFile, writeFile, mkdir, readdir, unlink } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

const HISTORY_DIR = "data/history";
const MAX_WEEKS_TO_KEEP = 12;

export interface Snapshot<T = unknown> {
  week: string; // ISO week format: YYYY-Www
  fetched_at: string;
  data: T;
}

/**
 * Get current ISO week string (e.g., "2024-W50")
 */
export function getCurrentWeek(): string {
  const now = new Date();
  const year = now.getFullYear();

  // Calculate ISO week number
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor(
    (now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
  );
  const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7);

  return `${year}-W${weekNum.toString().padStart(2, "0")}`;
}

/**
 * Get the directory path for a source's history
 */
function getSourceDir(source: string): string {
  return join(HISTORY_DIR, source);
}

/**
 * Ensure the history directory exists for a source
 */
async function ensureSourceDir(source: string): Promise<void> {
  const dir = getSourceDir(source);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

/**
 * Save a snapshot for the current week
 * If a snapshot already exists for this week, it will be overwritten
 */
export async function saveSnapshot<T>(source: string, data: T): Promise<void> {
  await ensureSourceDir(source);

  const week = getCurrentWeek();
  const snapshot: Snapshot<T> = {
    week,
    fetched_at: new Date().toISOString(),
    data,
  };

  const filePath = join(getSourceDir(source), `${week}.json`);
  await writeFile(filePath, JSON.stringify(snapshot, null, 2));

  // Prune old snapshots
  await pruneOldSnapshots(source);
}

/**
 * Get recent snapshots for a source, sorted by week (newest first)
 */
export async function getRecentSnapshots<T>(
  source: string,
  weeks: number = MAX_WEEKS_TO_KEEP
): Promise<Snapshot<T>[]> {
  const dir = getSourceDir(source);

  if (!existsSync(dir)) {
    return [];
  }

  const files = await readdir(dir);
  const jsonFiles = files
    .filter((f) => f.endsWith(".json"))
    .sort()
    .reverse() // Newest first
    .slice(0, weeks);

  const snapshots: Snapshot<T>[] = [];

  for (const file of jsonFiles) {
    try {
      const content = await readFile(join(dir, file), "utf-8");
      snapshots.push(JSON.parse(content) as Snapshot<T>);
    } catch {
      // Skip corrupt files
      console.warn(`Warning: Could not read history file ${file}`);
    }
  }

  return snapshots;
}

/**
 * Get a snapshot from N weeks ago
 */
export async function getSnapshotWeeksAgo<T>(
  source: string,
  weeksAgo: number
): Promise<Snapshot<T> | null> {
  const snapshots = await getRecentSnapshots<T>(source, weeksAgo + 1);
  return snapshots[weeksAgo] || null;
}

/**
 * Get all available weeks for a source
 */
export async function getAvailableWeeks(source: string): Promise<string[]> {
  const dir = getSourceDir(source);

  if (!existsSync(dir)) {
    return [];
  }

  const files = await readdir(dir);
  return files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""))
    .sort()
    .reverse();
}

/**
 * Remove snapshots older than MAX_WEEKS_TO_KEEP
 */
async function pruneOldSnapshots(source: string): Promise<void> {
  const dir = getSourceDir(source);
  const files = await readdir(dir);

  const jsonFiles = files.filter((f) => f.endsWith(".json")).sort().reverse();

  // Keep only the most recent MAX_WEEKS_TO_KEEP files
  const filesToDelete = jsonFiles.slice(MAX_WEEKS_TO_KEEP);

  for (const file of filesToDelete) {
    await unlink(join(dir, file));
    console.log(`Pruned old snapshot: ${source}/${file}`);
  }
}

/**
 * Check if we have any history for a source
 */
export async function hasHistory(source: string): Promise<boolean> {
  const weeks = await getAvailableWeeks(source);
  return weeks.length > 0;
}

/**
 * Get the number of weeks of history available
 */
export async function getHistoryDepth(source: string): Promise<number> {
  const weeks = await getAvailableWeeks(source);
  return weeks.length;
}

