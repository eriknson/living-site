/**
 * GitHub Fetcher
 * Fetches repos, languages, and recent commit activity for a user
 */

interface GitHubRepo {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  fork: boolean;
  pushed_at: string;
  html_url: string;
}

interface GitHubEvent {
  type: string;
  created_at: string;
  repo: { name: string };
  payload?: {
    commits?: { message: string; sha: string }[];
  };
}

export interface GitHubData {
  username: string;
  fetched_at: string;
  repos: {
    name: string;
    description: string | null;
    language: string | null;
    stars: number;
    url: string;
    last_pushed: string;
  }[];
  languages: Record<string, number>;
  recent_activity: {
    total_events: number;
    commits: number;
    repos_touched: string[];
    most_active_day: string | null;
    commit_messages: string[];
  };
}

const GITHUB_API = "https://api.github.com";

async function fetchJSON<T>(url: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "living-site-fetcher",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchGitHubData(
  username: string,
  token?: string
): Promise<GitHubData> {
  // Fetch public repos (non-forks, sorted by recent push)
  const repos = await fetchJSON<GitHubRepo[]>(
    `${GITHUB_API}/users/${username}/repos?type=owner&sort=pushed&per_page=100`,
    token
  );

  const ownRepos = repos.filter((r) => !r.fork);

  // Aggregate languages
  const languages: Record<string, number> = {};
  for (const repo of ownRepos) {
    if (repo.language) {
      languages[repo.language] = (languages[repo.language] || 0) + 1;
    }
  }

  // Fetch recent public events
  const events = await fetchJSON<GitHubEvent[]>(
    `${GITHUB_API}/users/${username}/events/public?per_page=100`,
    token
  );

  // Analyze activity
  const pushEvents = events.filter((e) => e.type === "PushEvent");
  const reposTouched = [...new Set(pushEvents.map((e) => e.repo.name))];

  // Extract commit messages from push events
  const commitMessages: string[] = [];
  for (const event of pushEvents) {
    if (event.payload?.commits) {
      for (const commit of event.payload.commits) {
        // Take first line of commit message
        const firstLine = commit.message.split("\n")[0].trim();
        if (firstLine) {
          commitMessages.push(firstLine);
        }
      }
    }
  }

  // Find most active day in last 30 days
  const dayCounts: Record<string, number> = {};
  for (const event of events) {
    const day = event.created_at.split("T")[0];
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  }
  const mostActiveDay =
    Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    username,
    fetched_at: new Date().toISOString(),
    repos: ownRepos.slice(0, 10).map((r) => ({
      name: r.name,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      url: r.html_url,
      last_pushed: r.pushed_at,
    })),
    languages,
    recent_activity: {
      total_events: events.length,
      commits: pushEvents.length,
      repos_touched: reposTouched.slice(0, 5),
      most_active_day: mostActiveDay,
      commit_messages: commitMessages.slice(0, 50), // Keep recent 50 messages
    },
  };
}

// CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
  const username = process.argv[2];
  if (!username) {
    console.error("Usage: npx tsx infra/fetchers/github.ts <username>");
    process.exit(1);
  }

  const token = process.env.GITHUB_TOKEN;
  fetchGitHubData(username, token)
    .then((data) => console.log(JSON.stringify(data, null, 2)))
    .catch((err) => {
      console.error("Error:", err.message);
      process.exit(1);
    });
}

