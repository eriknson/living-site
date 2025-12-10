/**
 * Typefully Baseline Computer
 * Computes narrative signals from X posting patterns via Typefully
 *
 * Analyzes: posting frequency, themes/tags, activity patterns
 */

import type { TypefullyData, PublishedPost } from "../fetchers/typefully.js";
import type { Snapshot } from "../history.js";
import type { SourceAnalysis } from "../baseline.js";
import { average, percentChange } from "../baseline.js";

/**
 * Extract common themes from post content
 */
function extractThemes(posts: PublishedPost[]): string[] {
  // Use tags if available
  const tagCounts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  // Return top tags sorted by frequency
  return [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag)
    .slice(0, 10);
}

/**
 * Calculate posting frequency (posts per week)
 */
function calculatePostingFrequency(posts: PublishedPost[]): number {
  if (posts.length < 2) return posts.length;

  const dates = posts.map((p) => new Date(p.published_at).getTime());
  const oldest = Math.min(...dates);
  const newest = Math.max(...dates);

  const weeks = (newest - oldest) / (7 * 24 * 60 * 60 * 1000);
  if (weeks < 1) return posts.length;

  return posts.length / weeks;
}

/**
 * Analyze recent activity patterns
 */
function analyzeActivityPattern(
  posts: PublishedPost[]
): "burst" | "steady" | "quiet" | "dormant" {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const thisWeek = posts.filter(
    (p) => new Date(p.published_at) >= oneWeekAgo
  ).length;
  const lastWeek = posts.filter((p) => {
    const date = new Date(p.published_at);
    return date >= twoWeeksAgo && date < oneWeekAgo;
  }).length;

  if (thisWeek === 0 && lastWeek === 0) return "dormant";
  if (thisWeek === 0) return "quiet";
  if (thisWeek > lastWeek * 1.5 && thisWeek >= 3) return "burst";
  return "steady";
}

/**
 * Compute baseline analysis for Typefully data
 */
export function computeTypefullyBaseline(
  current: TypefullyData,
  history: Snapshot<TypefullyData>[]
): SourceAnalysis {
  const narrativeSignals: string[] = [];
  const posts = current.published_posts;

  // Extract themes from all posts
  const themes = extractThemes(posts);

  // Calculate current frequency
  const currentFrequency = calculatePostingFrequency(posts);

  // Calculate historical average frequency if we have history
  let historicalFrequency: number | null = null;
  if (history.length > 0) {
    const historicalFrequencies = history.map((h) =>
      calculatePostingFrequency(h.data.published_posts)
    );
    historicalFrequency = average(historicalFrequencies);
  }

  // Analyze activity pattern
  const activityPattern = analyzeActivityPattern(posts);

  // Calculate stability (how consistent posting frequency is)
  let stabilityScore = 0.5; // Default
  if (history.length >= 2) {
    const weeklyPosts = history.map((h) => h.data.stats.posts_this_week);
    const avgWeekly = average(weeklyPosts);
    if (avgWeekly > 0) {
      const variance =
        weeklyPosts.reduce((sum, v) => sum + Math.pow(v - avgWeekly, 2), 0) /
        weeklyPosts.length;
      const cv = Math.sqrt(variance) / avgWeekly;
      stabilityScore = Math.max(0, Math.min(1, 1 - cv));
    }
  }

  // Generate narrative signals

  // Activity pattern signals
  if (activityPattern === "burst") {
    narrativeSignals.push("posting actively on X this week");
  } else if (activityPattern === "quiet") {
    narrativeSignals.push("quiet week on X");
  } else if (activityPattern === "dormant") {
    narrativeSignals.push("taking a break from posting on X");
  }

  // Frequency comparison signals
  if (historicalFrequency !== null && historicalFrequency > 0) {
    const change = percentChange(currentFrequency, historicalFrequency);
    if (change > 30) {
      narrativeSignals.push("posting more frequently than usual");
    } else if (change < -30) {
      narrativeSignals.push("posting less frequently lately");
    }
  }

  // Theme signals
  if (themes.length > 0) {
    const topThemes = themes.slice(0, 3);
    if (topThemes.length === 1) {
      narrativeSignals.push(`often posts about ${topThemes[0]}`);
    } else if (topThemes.length > 1) {
      narrativeSignals.push(`tweets about ${topThemes.join(", ")}`);
    }
  }

  // Stats-based signals
  if (current.stats.posts_this_month >= 20) {
    narrativeSignals.push("active on X with frequent updates");
  } else if (current.stats.posts_this_month >= 10) {
    narrativeSignals.push("regularly shares thoughts on X");
  }

  // Recent posts signal (if we have any recent posts)
  const recentPosts = posts.slice(0, 3);
  if (recentPosts.length > 0 && recentPosts[0].preview) {
    // Just note that they're active, the actual content is in the data
    const daysSinceLastPost = Math.floor(
      (Date.now() - new Date(recentPosts[0].published_at).getTime()) /
        (24 * 60 * 60 * 1000)
    );
    if (daysSinceLastPost === 0) {
      narrativeSignals.push("posted on X today");
    } else if (daysSinceLastPost === 1) {
      narrativeSignals.push("posted on X yesterday");
    } else if (daysSinceLastPost <= 3) {
      narrativeSignals.push("recently active on X");
    }
  }

  // If no signals generated, add a default
  if (narrativeSignals.length === 0) {
    if (posts.length > 0) {
      narrativeSignals.push(`${posts.length} posts on X via Typefully`);
    } else {
      narrativeSignals.push("no recent X posts");
    }
  }

  return {
    identity: {
      themes,
      average_frequency: historicalFrequency || currentFrequency,
      posting_style:
        currentFrequency > 5
          ? "frequent"
          : currentFrequency > 2
            ? "regular"
            : "occasional",
    },
    current_phase: {
      activity_pattern: activityPattern,
      posts_this_week: current.stats.posts_this_week,
      posts_this_month: current.stats.posts_this_month,
      recent_posts: posts.slice(0, 5).map((p) => ({
        preview: p.preview,
        published_at: p.published_at,
        url: p.x_published_url,
      })),
    },
    stability_score: stabilityScore,
    narrative_signals: narrativeSignals,
  };
}
