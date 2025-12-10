/**
 * Baseline Computer
 * Generic utilities for computing identity vs. current-phase patterns
 * and generating narrative signals from historical data
 */

import type { Snapshot } from "./history.js";

/**
 * Analysis result for any data source
 */
export interface SourceAnalysis {
  identity: Record<string, unknown>; // stable long-term patterns
  current_phase: Record<string, unknown>; // recent deviations
  stability_score: number; // 0-1, how consistent over time
  narrative_signals: string[]; // pre-computed insights for AI
}

/**
 * Type for a baseline computer function
 */
export type BaselineComputer<T> = (
  current: T,
  history: Snapshot<T>[]
) => SourceAnalysis;

// ============================================================================
// Generic Statistical Utilities
// ============================================================================

/**
 * Calculate the average of an array of numbers
 */
export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Calculate standard deviation
 */
export function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = average(values);
  const squareDiffs = values.map((v) => Math.pow(v - avg, 2));
  return Math.sqrt(average(squareDiffs));
}

/**
 * Calculate how many standard deviations a value is from the mean
 */
export function zScore(value: number, values: number[]): number {
  const avg = average(values);
  const std = standardDeviation(values);
  if (std === 0) return 0;
  return (value - avg) / std;
}

/**
 * Calculate percent change from baseline
 */
export function percentChange(current: number, baseline: number): number {
  if (baseline === 0) return current > 0 ? 100 : 0;
  return ((current - baseline) / baseline) * 100;
}

// ============================================================================
// Stability & Consistency Utilities
// ============================================================================

/**
 * Calculate Jaccard similarity between two sets
 * Returns 0-1 where 1 means identical sets
 */
export function jaccardSimilarity<T>(setA: Set<T>, setB: Set<T>): number {
  if (setA.size === 0 && setB.size === 0) return 1;

  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

/**
 * Calculate stability score for a list of items over time
 * Higher score = more consistent (same items appearing)
 */
export function calculateListStability<T>(
  lists: T[][],
  topN: number = 10
): number {
  if (lists.length < 2) return 1; // No history = assume stable

  const topItems = lists.map((list) => new Set(list.slice(0, topN)));

  // Compare each consecutive pair
  let totalSimilarity = 0;
  for (let i = 1; i < topItems.length; i++) {
    totalSimilarity += jaccardSimilarity(topItems[i - 1], topItems[i]);
  }

  return totalSimilarity / (topItems.length - 1);
}

/**
 * Calculate stability score for a numeric value over time
 * Lower coefficient of variation = more stable
 */
export function calculateNumericStability(values: number[]): number {
  if (values.length < 2) return 1;

  const avg = average(values);
  if (avg === 0) return 1;

  const std = standardDeviation(values);
  const cv = std / avg; // Coefficient of variation

  // Convert to 0-1 scale where 1 = very stable
  // CV of 0 = perfect stability (1.0)
  // CV of 0.5 = moderate variability (~0.5)
  // CV of 1+ = high variability (~0)
  return Math.max(0, 1 - cv);
}

// ============================================================================
// Trend Detection
// ============================================================================

export type TrendDirection = "increasing" | "decreasing" | "stable";

/**
 * Detect if a series of values is trending up, down, or stable
 */
export function detectTrend(values: number[]): TrendDirection {
  if (values.length < 3) return "stable";

  // Compare first half average to second half average
  const midpoint = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, midpoint);
  const secondHalf = values.slice(midpoint);

  const firstAvg = average(firstHalf);
  const secondAvg = average(secondHalf);

  const change = percentChange(secondAvg, firstAvg);

  // Need at least 15% change to be considered a trend
  if (change > 15) return "increasing";
  if (change < -15) return "decreasing";
  return "stable";
}

/**
 * Describe a numeric change in natural language
 */
export function describeChange(
  current: number,
  baseline: number,
  unit: string = ""
): string | null {
  const change = percentChange(current, baseline);
  const absChange = Math.abs(change);

  if (absChange < 10) return null; // Not significant

  const direction = change > 0 ? "up" : "down";
  const magnitude =
    absChange > 50 ? "significantly" : absChange > 25 ? "noticeably" : "slightly";

  const unitStr = unit ? ` ${unit}` : "";
  return `${magnitude} ${direction} (${current}${unitStr} vs typical ${Math.round(baseline)}${unitStr})`;
}

// ============================================================================
// Item Comparison Utilities
// ============================================================================

/**
 * Find items that appear in recent but not in long-term (new explorations)
 */
export function findNewItems<T>(recent: T[], longTerm: T[]): T[] {
  const longTermSet = new Set(longTerm);
  return recent.filter((item) => !longTermSet.has(item));
}

/**
 * Find items that appear consistently across multiple lists (core identity)
 */
export function findCoreItems<T>(
  lists: T[][],
  minAppearanceRatio: number = 0.7
): T[] {
  if (lists.length === 0) return [];

  const counts = new Map<T, number>();
  for (const list of lists) {
    const seen = new Set<T>();
    for (const item of list) {
      if (!seen.has(item)) {
        counts.set(item, (counts.get(item) || 0) + 1);
        seen.add(item);
      }
    }
  }

  const threshold = lists.length * minAppearanceRatio;
  return [...counts.entries()]
    .filter(([, count]) => count >= threshold)
    .map(([item]) => item);
}

/**
 * Calculate what percentage of recent items are "new" (not in baseline)
 */
export function calculateDiscoveryRate<T>(recent: T[], baseline: T[]): number {
  if (recent.length === 0) return 0;
  const newItems = findNewItems(recent, baseline);
  return newItems.length / recent.length;
}

