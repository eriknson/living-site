/**
 * Aggregator
 * Combines raw data from fetchers into themes and builds the payload for generation
 */

import { readFile, writeFile } from "fs/promises";
import { fetchGitHubData, type GitHubData } from "./fetchers/github.js";

interface Identity {
  name: string;
  location: string;
  email: string;
  twitter: string;
  linkedin: string;
  website: string;
  github: string;
}

interface Theme {
  label: string;
  confidence: number; // 0-1
  source: string;
  detail?: string;
}

interface AggregatedData {
  generated_at: string;
  formatted_updated_at: string;
  identity: Identity;
  sources: {
    github?: GitHubData;
    // Future: spotify, strava, notion, weather
  };
  themes: Theme[];
  context: {
    season: string;
    days_since_change: number;
  };
}

function getSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "autumn";
  return "winter";
}

function formatBuildTimestamp(date: Date): string {
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const day = date.getDate();
  const ordinal =
    day === 1 || day === 21 || day === 31
      ? "st"
      : day === 2 || day === 22
        ? "nd"
        : day === 3 || day === 23
          ? "rd"
          : "th";
  const month = date.toLocaleString("en-US", { month: "long" });
  const year = date.getFullYear();

  return `${time}, ${month} ${day}${ordinal}, ${year}`;
}

function extractThemesFromGitHub(github: GitHubData): Theme[] {
  const themes: Theme[] = [];

  // Language focus
  const sortedLangs = Object.entries(github.languages).sort(
    (a, b) => b[1] - a[1]
  );
  if (sortedLangs.length > 0) {
    const [topLang, count] = sortedLangs[0];
    themes.push({
      label: `${topLang} focused`,
      confidence: Math.min(count / 10, 1),
      source: "github",
      detail: `${count} repos in ${topLang}`,
    });
  }

  // Activity level
  const { commits, repos_touched } = github.recent_activity;
  if (commits > 20) {
    themes.push({
      label: "actively building",
      confidence: 0.9,
      source: "github",
      detail: `${commits} commits across ${repos_touched.length} repos recently`,
    });
  } else if (commits > 5) {
    themes.push({
      label: "steadily coding",
      confidence: 0.7,
      source: "github",
      detail: `${commits} commits recently`,
    });
  }

  // Recent project focus
  const recentRepos = github.repos.slice(0, 3);
  for (const repo of recentRepos) {
    if (repo.description) {
      themes.push({
        label: `working on ${repo.name}`,
        confidence: 0.8,
        source: "github",
        detail: repo.description,
      });
    }
  }

  return themes;
}

async function loadPreviousData(): Promise<AggregatedData | null> {
  try {
    const content = await readFile("data/latest.json", "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function calculateDaysSinceChange(
  previous: AggregatedData | null,
  current: Theme[]
): number {
  if (!previous) return 0;

  const prevLabels = new Set(previous.themes.map((t) => t.label));
  const currLabels = new Set(current.map((t) => t.label));

  // Check if themes have meaningfully changed
  const hasNewThemes = [...currLabels].some((l) => !prevLabels.has(l));
  if (hasNewThemes) return 0;

  return previous.context.days_since_change + 1;
}

export async function aggregate(): Promise<AggregatedData> {
  // Load identity
  const identityRaw = await readFile("data/identity.json", "utf-8");
  const identity: Identity = JSON.parse(identityRaw);

  // Fetch from sources
  const github = await fetchGitHubData(
    identity.github,
    process.env.GITHUB_TOKEN
  );

  // Extract themes
  const themes: Theme[] = [...extractThemesFromGitHub(github)];

  // Sort by confidence
  themes.sort((a, b) => b.confidence - a.confidence);

  // Load previous data for change detection
  const previous = await loadPreviousData();
  const daysSinceChange = calculateDaysSinceChange(previous, themes);

  const now = new Date();
  const data: AggregatedData = {
    generated_at: now.toISOString(),
    formatted_updated_at: formatBuildTimestamp(now),
    identity,
    sources: { github },
    themes: themes.slice(0, 5), // Top 5 themes
    context: {
      season: getSeason(),
      days_since_change: daysSinceChange,
    },
  };

  // Write to latest.json
  await writeFile("data/latest.json", JSON.stringify(data, null, 2));

  return data;
}

// CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
  aggregate()
    .then((data) => {
      console.log("Aggregated data written to data/latest.json");
      console.log(`\nThemes found: ${data.themes.length}`);
      for (const theme of data.themes) {
        console.log(`  - ${theme.label} (${theme.source})`);
      }
    })
    .catch((err) => {
      console.error("Error:", err.message);
      process.exit(1);
    });
}

