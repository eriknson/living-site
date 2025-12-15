/**
 * GitHub Fetcher
 * Fetches repos, languages, and recent commit activity for a user
 * Prioritizes recent activity and includes external contributions
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
  repo: { name: string; url: string };
  payload?: {
    commits?: { message: string; sha: string }[];
    action?: string;
    pull_request?: {
      title: string;
      html_url: string;
      merged: boolean;
    };
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
  // External contributions (PRs to repos you don't own)
  external_contributions: {
    repo: string;
    type: "pull_request" | "push" | "review";
    title?: string;
    url?: string;
    created_at: string;
  }[];
  // Repos ordered by recent activity (most active first)
  active_repos: {
    name: string;
    full_name: string;
    description: string | null;
    language: string | null;
    stars: number;
    url: string;
    last_pushed: string;
    recent_commits: number; // commits in the events window
    is_owned: boolean;
  }[];
}

const GITHUB_API = "https://api.github.com";
const RECENCY_MONTHS = 9; // Only include repos touched in last 9 months

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
  const ownRepoNames = new Set(ownRepos.map((r) => `${username}/${r.name}`));

  // Aggregate languages from owned repos
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

  // Track activity per repo from events
  const repoActivity: Map<string, { commits: number; lastEvent: string }> =
    new Map();
  const externalContributions: GitHubData["external_contributions"] = [];

  // Analyze events
  const pushEvents = events.filter((e) => e.type === "PushEvent");
  const commitMessages: string[] = [];

  for (const event of events) {
    const repoName = event.repo.name;
    const isOwned = ownRepoNames.has(repoName);

    // Track activity for all repos
    if (!repoActivity.has(repoName)) {
      repoActivity.set(repoName, { commits: 0, lastEvent: event.created_at });
    }

    if (event.type === "PushEvent") {
      const activity = repoActivity.get(repoName)!;
      const commitCount = event.payload?.commits?.length || 0;
      activity.commits += commitCount;

      // Extract commit messages
      if (event.payload?.commits) {
        for (const commit of event.payload.commits) {
          const firstLine = commit.message.split("\n")[0].trim();
          if (firstLine) {
            commitMessages.push(firstLine);
          }
        }
      }

      // Track external pushes (rare but possible for collaborators)
      if (!isOwned) {
        externalContributions.push({
          repo: repoName,
          type: "push",
          created_at: event.created_at,
        });
      }
    }

    // Track PRs (especially to external repos)
    if (
      event.type === "PullRequestEvent" &&
      event.payload?.action === "opened"
    ) {
      if (!isOwned) {
        externalContributions.push({
          repo: repoName,
          type: "pull_request",
          title: event.payload.pull_request?.title,
          url: event.payload.pull_request?.html_url,
          created_at: event.created_at,
        });
      }
    }

    // Track PR reviews on external repos
    if (event.type === "PullRequestReviewEvent" && !isOwned) {
      externalContributions.push({
        repo: repoName,
        type: "review",
        title: event.payload?.pull_request?.title,
        url: event.payload?.pull_request?.html_url,
        created_at: event.created_at,
      });
    }
  }

  // Find most active day
  const dayCounts: Record<string, number> = {};
  for (const event of events) {
    const day = event.created_at.split("T")[0];
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  }
  const mostActiveDay =
    Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // Build active_repos list: prioritize by recent activity
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - RECENCY_MONTHS);

  // Get repos with activity, sorted by commit count
  const activeRepoNames = [...repoActivity.entries()]
    .sort((a, b) => b[1].commits - a[1].commits)
    .map(([name]) => name);

  // Filter owned repos to recent ones
  const recentOwnedRepos = ownRepos.filter((r) => {
    const pushedDate = new Date(r.pushed_at);
    const isRecentlyPushed = pushedDate >= cutoffDate;
    const hasRecentActivity = repoActivity.has(`${username}/${r.name}`);
    return isRecentlyPushed || hasRecentActivity;
  });

  // Build active_repos combining activity data with repo metadata
  const activeRepos: GitHubData["active_repos"] = [];

  // First add repos from activity (most active first)
  for (const fullName of activeRepoNames) {
    const [owner, repoName] = fullName.split("/");
    const isOwned = owner === username;
    const activity = repoActivity.get(fullName)!;

    // Find repo metadata if it's owned
    const ownedRepo = isOwned
      ? recentOwnedRepos.find((r) => r.name === repoName)
      : null;

    activeRepos.push({
      name: repoName,
      full_name: fullName,
      description: ownedRepo?.description || null,
      language: ownedRepo?.language || null,
      stars: ownedRepo?.stargazers_count || 0,
      url: ownedRepo?.html_url || `https://github.com/${fullName}`,
      last_pushed: ownedRepo?.pushed_at || activity.lastEvent,
      recent_commits: activity.commits,
      is_owned: isOwned,
    });
  }

  // Add any recent owned repos not in activity (e.g., pushed via another machine)
  for (const repo of recentOwnedRepos) {
    const fullName = `${username}/${repo.name}`;
    if (!repoActivity.has(fullName)) {
      activeRepos.push({
        name: repo.name,
        full_name: fullName,
        description: repo.description,
        language: repo.language,
        stars: repo.stargazers_count,
        url: repo.html_url,
        last_pushed: repo.pushed_at,
        recent_commits: 0,
        is_owned: true,
      });
    }
  }

  // Deduplicate external contributions (same repo might have multiple events)
  const uniqueExternalRepos = new Map<
    string,
    GitHubData["external_contributions"][0]
  >();
  for (const contrib of externalContributions) {
    // Keep the most interesting one (PR > review > push)
    const existing = uniqueExternalRepos.get(contrib.repo);
    if (!existing || contrib.type === "pull_request") {
      uniqueExternalRepos.set(contrib.repo, contrib);
    }
  }

  const reposTouched = [...new Set(pushEvents.map((e) => e.repo.name))];

  return {
    username,
    fetched_at: new Date().toISOString(),
    // Keep legacy repos field but filter to recent
    repos: recentOwnedRepos.slice(0, 10).map((r) => ({
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
      commit_messages: commitMessages.slice(0, 50),
    },
    external_contributions: [...uniqueExternalRepos.values()].slice(0, 10),
    active_repos: activeRepos.slice(0, 15),
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
