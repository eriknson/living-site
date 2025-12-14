/**
 * Inspiration Fetcher
 * Fetches daily design inspiration from Hacker News and Reddit
 * to give agents fresh creative direction each build.
 *
 * Sources:
 * - Hacker News Algolia API (free, no auth)
 * - Reddit public JSON endpoints (no auth, rate-limited)
 */

const HN_ALGOLIA_API = "https://hn.algolia.com/api/v1/search";
const REDDIT_BASE = "https://www.reddit.com";

// Design-related keywords to search for on HN
const HN_SEARCH_TERMS = ["design", "typography", "css", "minimal", "ui", "ux"];

// Subreddits to pull design inspiration from
const REDDIT_SUBREDDITS = ["web_design", "Design"];

// Common design keywords to extract from titles
const DESIGN_KEYWORDS = [
  "minimal",
  "minimalist",
  "brutalist",
  "dark mode",
  "light mode",
  "typography",
  "grid",
  "bento",
  "glassmorphism",
  "neomorphism",
  "gradient",
  "monochrome",
  "serif",
  "sans-serif",
  "whitespace",
  "animation",
  "motion",
  "responsive",
  "mobile",
  "portfolio",
  "landing",
  "hero",
  "card",
  "layout",
  "color",
  "palette",
  "contrast",
  "accessibility",
  "a11y",
  "bold",
  "clean",
  "modern",
  "retro",
  "vintage",
  "aesthetic",
  "flat",
  "3d",
  "illustration",
  "icon",
  "font",
  "spacing",
];

interface HNHit {
  title: string;
  url: string | null;
  points: number;
  objectID: string;
}

interface HNResponse {
  hits: HNHit[];
}

interface RedditPost {
  data: {
    title: string;
    score: number;
    subreddit: string;
    link_flair_text: string | null;
    permalink: string;
  };
}

interface RedditResponse {
  data: {
    children: RedditPost[];
  };
}

export interface InspirationData {
  fetched_at: string;
  hacker_news: {
    stories: { title: string; url: string; points: number }[];
    keywords: string[];
  };
  reddit: {
    posts: {
      title: string;
      subreddit: string;
      score: number;
      flair?: string;
    }[];
    keywords: string[];
  };
  combined_keywords: string[];
  design_direction: string;
}

/**
 * Extract design-related keywords from a list of titles
 */
function extractKeywords(titles: string[]): string[] {
  const combined = titles.join(" ").toLowerCase();
  const found: Record<string, number> = {};

  for (const keyword of DESIGN_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword.replace(/\s+/g, "\\s+")}\\b`, "gi");
    const matches = combined.match(regex);
    if (matches) {
      found[keyword] = matches.length;
    }
  }

  // Sort by frequency and return top keywords
  return Object.entries(found)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword]) => keyword);
}

/**
 * Generate a design direction summary from keywords
 */
function generateDesignDirection(keywords: string[]): string {
  if (keywords.length === 0) {
    return "varied design discussions today";
  }

  const top = keywords.slice(0, 4);

  // Group keywords into themes
  const themes: string[] = [];

  if (top.some((k) => ["minimal", "minimalist", "clean", "whitespace"].includes(k))) {
    themes.push("minimal aesthetics");
  }
  if (top.some((k) => ["dark mode", "monochrome", "contrast"].includes(k))) {
    themes.push("dark themes");
  }
  if (top.some((k) => ["typography", "font", "serif", "sans-serif", "bold"].includes(k))) {
    themes.push("bold typography");
  }
  if (top.some((k) => ["grid", "bento", "layout", "card"].includes(k))) {
    themes.push("grid layouts");
  }
  if (top.some((k) => ["animation", "motion", "3d"].includes(k))) {
    themes.push("motion and depth");
  }
  if (top.some((k) => ["brutalist", "retro", "vintage"].includes(k))) {
    themes.push("experimental styles");
  }

  if (themes.length === 0) {
    return `trending: ${top.join(", ")}`;
  }

  return themes.join(", ") + " trending";
}

/**
 * Fetch design-related stories from Hacker News
 */
async function fetchHNDesign(): Promise<{
  stories: { title: string; url: string; points: number }[];
  keywords: string[];
}> {
  const query = HN_SEARCH_TERMS.join(" OR ");
  const url = `${HN_ALGOLIA_API}?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=15`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "living-site-inspiration/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`HN Algolia API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as HNResponse;

  const stories = data.hits
    .filter((hit) => hit.points > 10) // Only include stories with some traction
    .slice(0, 10)
    .map((hit) => ({
      title: hit.title,
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      points: hit.points,
    }));

  const titles = stories.map((s) => s.title);
  const keywords = extractKeywords(titles);

  return { stories, keywords };
}

/**
 * Fetch top posts from a Reddit subreddit
 */
async function fetchRedditSubreddit(
  subreddit: string
): Promise<{ title: string; score: number; flair?: string }[]> {
  const url = `${REDDIT_BASE}/r/${subreddit}/top.json?t=day&limit=10`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "living-site-inspiration/1.0 (daily design fetch)",
    },
  });

  if (!response.ok) {
    // Reddit might rate limit - return empty rather than failing
    console.warn(`Reddit r/${subreddit} returned ${response.status}, skipping`);
    return [];
  }

  const data = (await response.json()) as RedditResponse;

  return data.data.children.map((post) => ({
    title: post.data.title,
    score: post.data.score,
    flair: post.data.link_flair_text || undefined,
  }));
}

/**
 * Fetch design posts from Reddit design subreddits
 */
async function fetchRedditDesign(): Promise<{
  posts: { title: string; subreddit: string; score: number; flair?: string }[];
  keywords: string[];
}> {
  const allPosts: { title: string; subreddit: string; score: number; flair?: string }[] = [];

  // Fetch from each subreddit
  for (const subreddit of REDDIT_SUBREDDITS) {
    try {
      const posts = await fetchRedditSubreddit(subreddit);
      for (const post of posts) {
        allPosts.push({ ...post, subreddit });
      }
    } catch (err) {
      console.warn(`Failed to fetch r/${subreddit}:`, (err as Error).message);
    }
  }

  // Sort by score and take top posts
  const topPosts = allPosts.sort((a, b) => b.score - a.score).slice(0, 10);

  const titles = topPosts.map((p) => p.title);
  const keywords = extractKeywords(titles);

  return { posts: topPosts, keywords };
}

/**
 * Fetch daily design inspiration from HN and Reddit
 */
export async function fetchInspirationData(): Promise<InspirationData> {
  // Fetch from both sources in parallel
  const [hnResult, redditResult] = await Promise.all([
    fetchHNDesign().catch((err) => {
      console.warn("HN fetch failed:", err.message);
      return { stories: [], keywords: [] };
    }),
    fetchRedditDesign().catch((err) => {
      console.warn("Reddit fetch failed:", err.message);
      return { posts: [], keywords: [] };
    }),
  ]);

  // Combine keywords from both sources (deduplicated)
  const allKeywords = [...new Set([...hnResult.keywords, ...redditResult.keywords])];
  const combinedKeywords = allKeywords.slice(0, 10);

  // Generate design direction summary
  const designDirection = generateDesignDirection(combinedKeywords);

  return {
    fetched_at: new Date().toISOString(),
    hacker_news: hnResult,
    reddit: redditResult,
    combined_keywords: combinedKeywords,
    design_direction: designDirection,
  };
}

/**
 * Summarize inspiration data for fetch logs
 */
export function summarizeInspiration(data: InspirationData): string {
  const hnCount = data.hacker_news.stories.length;
  const redditCount = data.reddit.posts.length;
  const topKeywords = data.combined_keywords.slice(0, 3).join(", ");

  return `${hnCount} HN stories, ${redditCount} Reddit posts, keywords: ${topKeywords || "none"}`;
}

// CLI runner for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchInspirationData()
    .then((data) => {
      console.log(JSON.stringify(data, null, 2));
      console.log("\n---");
      console.log("Summary:", summarizeInspiration(data));
    })
    .catch((err) => {
      console.error("Error:", err.message);
      process.exit(1);
    });
}

