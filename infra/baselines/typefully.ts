/**
 * Typefully Baseline Computer
 * Computes narrative signals from X posting patterns via Typefully
 * Also incorporates static twitter history from manual imports
 *
 * Analyzes: posting frequency, themes/tags, activity patterns
 */

import { readFileSync, existsSync } from "fs";
import type { TypefullyData, PublishedPost } from "../fetchers/typefully.js";
import type { Snapshot } from "../history.js";
import type { SourceAnalysis } from "../baseline.js";
import { average, percentChange } from "../baseline.js";

interface HistoricTweet {
  text: string;
  date: string;
  likes: number | null;
  retweets: number | null;
  views: number | null;
  has_media: boolean;
  pinned?: boolean;
}

interface TwitterThemes {
  core_vision: string;
  beliefs: string[];
  interests: string[];
}

interface TwitterHistory {
  imported_at: string;
  source: string;
  username: string;
  themes?: TwitterThemes;
  tweets: HistoricTweet[];
}

/**
 * Load static twitter history if available
 */
function loadTwitterHistory(): TwitterHistory | null {
  const historyPath = "data/twitter-history.json";
  if (!existsSync(historyPath)) {
    return null;
  }
  try {
    const content = readFileSync(historyPath, "utf-8");
    return JSON.parse(content) as TwitterHistory;
  } catch {
    return null;
  }
}

/**
 * Extract topics/themes from tweet text using keyword analysis
 */
function extractTopicsFromText(tweets: HistoricTweet[]): string[] {
  const topicKeywords: Record<string, string[]> = {
    "ai agents": ["agent", "agents", "agentic"],
    "cursor": ["cursor", "composer"],
    "building software": ["build", "builds", "building", "ship", "shipping"],
    "developer tools": ["cli", "code", "codebase", "prototype"],
    "workflow": ["flow", "workflow", "iteration", "iterate"],
    "vision & planning": ["vision", "plan", "planning", "roadmap"],
  };

  const topicCounts = new Map<string, number>();
  const allText = tweets.map((t) => t.text.toLowerCase()).join(" ");

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    let count = 0;
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, "gi");
      const matches = allText.match(regex);
      if (matches) count += matches.length;
    }
    if (count > 0) {
      topicCounts.set(topic, count);
    }
  }

  return [...topicCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([topic]) => topic);
}

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
 * Also incorporates static twitter history for richer signals
 */
export function computeTypefullyBaseline(
  current: TypefullyData,
  history: Snapshot<TypefullyData>[]
): SourceAnalysis {
  const narrativeSignals: string[] = [];
  const posts = current.published_posts;

  // Load static twitter history
  const twitterHistory = loadTwitterHistory();

  // Extract themes from Typefully posts (tags)
  const themes = extractThemes(posts);

  // Get explicit themes from history, or fall back to text extraction
  let coreVision: string | null = null;
  let beliefs: string[] = [];
  let interests: string[] = [];
  let recentTweets: HistoricTweet[] = [];
  let topTweet: HistoricTweet | null = null;

  if (twitterHistory) {
    // Use explicit themes if defined
    if (twitterHistory.themes) {
      coreVision = twitterHistory.themes.core_vision;
      beliefs = twitterHistory.themes.beliefs;
      interests = twitterHistory.themes.interests;
    }

    if (twitterHistory.tweets.length > 0) {
      recentTweets = twitterHistory.tweets.slice(0, 5);

      // Find highest engagement tweet
      const tweetsWithLikes = twitterHistory.tweets.filter((t) => t.likes !== null);
      if (tweetsWithLikes.length > 0) {
        topTweet = tweetsWithLikes.reduce((best, current) =>
          (current.likes || 0) > (best.likes || 0) ? current : best
        );
      }
    }
  }

  // Fall back to text extraction if no explicit themes
  const topics = interests.length > 0 
    ? interests 
    : (twitterHistory ? extractTopicsFromText(twitterHistory.tweets) : []);

  // Calculate current frequency from Typefully
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

  // Core vision signal (the main theme)
  if (coreVision) {
    narrativeSignals.push(`on X: ${coreVision}`);
  }

  // Beliefs/philosophy signals
  if (beliefs.length > 0) {
    // Pick 1-2 beliefs to highlight
    const highlightBeliefs = beliefs.slice(0, 2);
    for (const belief of highlightBeliefs) {
      narrativeSignals.push(belief);
    }
  }

  // Interest signals
  if (topics.length > 0) {
    narrativeSignals.push(`interested in ${topics.join(", ")}`);
  }

  // Top performing tweet signal
  if (topTweet && topTweet.likes && topTweet.likes > 1000) {
    const preview = topTweet.text.length > 40 
      ? topTweet.text.slice(0, 40) + "..." 
      : topTweet.text;
    narrativeSignals.push(`viral tweet: "${preview}" (${(topTweet.likes / 1000).toFixed(0)}K likes)`);
  }

  // Activity pattern signals from Typefully
  if (activityPattern === "burst") {
    narrativeSignals.push("posting actively on X this week");
  } else if (activityPattern === "quiet" && twitterHistory) {
    // Only mention quiet if we have history showing they usually post
    narrativeSignals.push("quiet week on X");
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

  // Theme signals from Typefully tags
  if (themes.length > 0) {
    const topThemes = themes.slice(0, 3);
    if (topThemes.length > 1) {
      narrativeSignals.push(`tags: ${topThemes.join(", ")}`);
    }
  }

  // Recent posts signal from Typefully
  const recentPosts = posts.slice(0, 3);
  if (recentPosts.length > 0 && recentPosts[0].preview) {
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

  // If no signals from Typefully but we have history, use that
  if (narrativeSignals.length === 0 && twitterHistory) {
    narrativeSignals.push(`${twitterHistory.tweets.length} recent tweets on record`);
  }

  // Build recent tweets list combining both sources
  const allRecentTweets = [
    ...recentTweets.map((t) => ({
      preview: t.text,
      published_at: t.date,
      url: null as string | null,
      likes: t.likes,
    })),
    ...posts.slice(0, 5).map((p) => ({
      preview: p.preview,
      published_at: p.published_at,
      url: p.x_published_url,
      likes: null as number | null,
    })),
  ]
    .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
    .slice(0, 5);

  return {
    identity: {
      core_vision: coreVision,
      beliefs,
      interests: topics,
      themes,
      average_frequency: historicalFrequency || currentFrequency,
      posting_style:
        currentFrequency > 5
          ? "frequent"
          : currentFrequency > 2
            ? "regular"
            : "occasional",
      top_tweet: topTweet
        ? { text: topTweet.text, likes: topTweet.likes, date: topTweet.date }
        : null,
    },
    current_phase: {
      activity_pattern: activityPattern,
      posts_this_week: current.stats.posts_this_week,
      posts_this_month: current.stats.posts_this_month,
      recent_tweets: allRecentTweets,
    },
    stability_score: stabilityScore,
    narrative_signals: narrativeSignals,
  };
}
