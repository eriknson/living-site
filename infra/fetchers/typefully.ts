/**
 * Typefully Fetcher
 * Fetches published posts from X via the Typefully API
 */

const TYPEFULLY_API = "https://api.typefully.com";

interface TypefullySocialSet {
  id: number;
  username: string;
  name: string;
  profile_image_url: string;
}

interface TypefullyDraft {
  id: number;
  preview: string;
  status: string;
  published_at: string | null;
  x_post_enabled: boolean;
  x_published_url: string | null;
  x_post_published_at: string | null;
  tags: string[];
  created_at: string;
}

interface TypefullyDraftsResponse {
  results: TypefullyDraft[];
  count: number;
  limit: number;
  offset: number;
  next: string | null;
}

interface TypefullySocialSetsResponse {
  results: TypefullySocialSet[];
  count: number;
}

export interface PublishedPost {
  id: number;
  preview: string;
  published_at: string;
  x_published_url: string | null;
  tags: string[];
}

export interface TypefullyData {
  fetched_at: string;
  social_set: {
    id: number;
    username: string;
    name: string;
  };
  published_posts: PublishedPost[];
  stats: {
    total_published: number;
    posts_this_week: number;
    posts_this_month: number;
  };
}

/**
 * Fetch JSON from Typefully API with authentication
 */
async function fetchTypefullyAPI<T>(
  endpoint: string,
  apiKey: string
): Promise<T> {
  const response = await fetch(`${TYPEFULLY_API}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Typefully API error: ${response.status} ${error}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Calculate posting stats from published posts
 */
function calculateStats(posts: PublishedPost[]): TypefullyData["stats"] {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const postsThisWeek = posts.filter(
    (p) => new Date(p.published_at) >= oneWeekAgo
  ).length;

  const postsThisMonth = posts.filter(
    (p) => new Date(p.published_at) >= oneMonthAgo
  ).length;

  return {
    total_published: posts.length,
    posts_this_week: postsThisWeek,
    posts_this_month: postsThisMonth,
  };
}

/**
 * Fetch all published drafts with pagination
 */
async function fetchAllPublishedDrafts(
  apiKey: string,
  socialSetId: number,
  maxPages: number = 3
): Promise<TypefullyDraft[]> {
  const allDrafts: TypefullyDraft[] = [];
  let offset = 0;
  const limit = 50;

  for (let page = 0; page < maxPages; page++) {
    const response = await fetchTypefullyAPI<TypefullyDraftsResponse>(
      `/v2/social-sets/${socialSetId}/drafts?status=published&limit=${limit}&offset=${offset}`,
      apiKey
    );

    allDrafts.push(...response.results);

    // Stop if we've fetched all or there's no next page
    if (!response.next || allDrafts.length >= response.count) {
      break;
    }

    offset += limit;
  }

  return allDrafts;
}

/**
 * Main fetch function - gets published X posts from Typefully
 */
export async function fetchTypefullyData(
  apiKey: string
): Promise<TypefullyData> {
  // Get social sets (connected accounts)
  const socialSets = await fetchTypefullyAPI<TypefullySocialSetsResponse>(
    "/v2/social-sets",
    apiKey
  );

  if (socialSets.results.length === 0) {
    throw new Error("No social sets found in Typefully account");
  }

  // Use the first social set (primary account)
  const socialSet = socialSets.results[0];

  // Fetch published drafts
  const drafts = await fetchAllPublishedDrafts(apiKey, socialSet.id);

  // Filter for X-enabled posts with published URLs
  const xPosts = drafts
    .filter((d) => d.x_post_enabled && d.published_at)
    .map((d) => ({
      id: d.id,
      preview: d.preview,
      published_at: d.published_at!,
      x_published_url: d.x_published_url,
      tags: d.tags || [],
    }))
    .sort(
      (a, b) =>
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );

  const stats = calculateStats(xPosts);

  return {
    fetched_at: new Date().toISOString(),
    social_set: {
      id: socialSet.id,
      username: socialSet.username,
      name: socialSet.name,
    },
    published_posts: xPosts,
    stats,
  };
}

/**
 * Check if Typefully credentials are available
 */
export function hasTypefullyCredentials(): boolean {
  return !!process.env.TYPEFULLY_API_KEY;
}

/**
 * Fetch Typefully data using environment variables
 */
export async function fetchTypefullyDataFromEnv(): Promise<TypefullyData | null> {
  const apiKey = process.env.TYPEFULLY_API_KEY;

  if (!apiKey) {
    console.log("Typefully API key not configured, skipping");
    return null;
  }

  return fetchTypefullyData(apiKey);
}

// CLI runner for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchTypefullyDataFromEnv()
    .then((data) => {
      if (data) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log("No Typefully data (API key not configured)");
      }
    })
    .catch((err) => {
      console.error("Error:", err.message);
      process.exit(1);
    });
}
