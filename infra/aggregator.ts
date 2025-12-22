/**
 * Aggregator
 * Combines raw data from fetchers, stores history, computes baselines,
 * and builds the payload for generation with narrative signals
 */

import { readFile, writeFile } from "fs/promises";
import { fetchGitHubData, type GitHubData } from "./fetchers/github.js";
import {
  fetchSpotifyDataFromEnv,
  hasSpotifyCredentials,
  type SpotifyData,
} from "./fetchers/spotify.js";
import {
  fetchTypefullyDataFromEnv,
  hasTypefullyCredentials,
  type TypefullyData,
} from "./fetchers/typefully.js";
import {
  fetchWeatherData,
  type WeatherData,
} from "./fetchers/weather.js";
import { saveSnapshot, getRecentSnapshots, type Snapshot } from "./history.js";
import { computeGitHubBaseline } from "./baselines/github.js";
import { computeSpotifyBaseline } from "./baselines/spotify.js";
import { computeTypefullyBaseline } from "./baselines/typefully.js";
import type { SourceAnalysis } from "./baseline.js";

interface Identity {
  name: string;
  location?: string;
  email: string;
  twitter: string;
  linkedin: string;
  website?: string;
  github: string;
}

interface About {
  headline: string;
  bio: string;
}

// FetchSummary types are defined in lib/shared-types.ts
// Re-exported here for backwards compatibility
export type { FetchSummary, FetchSourceResult } from "../lib/shared-types.js";
import type { FetchSourceResult, FetchSummary } from "../lib/shared-types.js";

function summarizeGitHub(data: GitHubData): string {
  const parts: string[] = [];

  // Show most active repos first (from new active_repos field)
  const activeRepos = data.active_repos || [];
  const topActive = activeRepos.filter((r) => r.recent_commits > 0).slice(0, 2);
  if (topActive.length > 0) {
    const repoStr = topActive.map((r) => r.name).join(", ");
    parts.push(`active: ${repoStr}`);
  }

  // Activity counts
  parts.push(`${data.recent_activity.commits} push events`);

  // External contributions
  const externalCount = data.external_contributions?.length || 0;
  if (externalCount > 0) {
    parts.push(`${externalCount} external contributions`);
  }

  return parts.join(", ");
}

function summarizeSpotify(data: SpotifyData): string {
  const topArtist = data.short_term.artists[0]?.name || "unknown";
  const topGenre = data.short_term.genres[0] || "unknown";
  return `Top artist: ${topArtist}, genre: ${topGenre}`;
}

function summarizeTypefully(data: TypefullyData): string {
  const parts = [
    `${data.stats.total_published} posts`,
    `${data.stats.posts_this_week} this week`,
  ];
  return parts.join(", ");
}

interface AggregatedData {
  generated_at: string;
  identity: Identity;
  about: About;
  sources: {
    github?: GitHubData;
    spotify?: SpotifyData;
    typefully?: TypefullyData;
    weather?: WeatherData;
  };
  analysis: {
    github?: SourceAnalysis;
    spotify?: SourceAnalysis;
    typefully?: SourceAnalysis;
  };
  context: {
    season: string;
  };
}

function getSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  if (month >= 8 && month <= 10) return "autumn";
  return "winter";
}

// Lightweight context for agent consumption (replaces heavy latest.json for prompts)
interface LightContext {
  date: string;
  season: string;
  weather?: { temp_c: number; conditions: string };
  listening?: string[];
  building?: string[];
}

function buildLightContext(data: AggregatedData): LightContext {
  const context: LightContext = {
    date: new Date().toISOString().split("T")[0],
    season: data.context.season,
  };

  // Weather
  if (data.sources.weather?.current) {
    context.weather = {
      temp_c: data.sources.weather.current.temperature_c,
      conditions: data.sources.weather.current.conditions,
    };
  }

  // Top artists from Spotify (medium term for stability)
  if (data.sources.spotify?.medium_term?.artists) {
    context.listening = data.sources.spotify.medium_term.artists
      .slice(0, 5)
      .map((a) => a.name);
  }

  // Active repos from GitHub
  if (data.sources.github?.active_repos) {
    context.building = data.sources.github.active_repos
      .filter((r) => r.is_owned)
      .slice(0, 3)
      .map((r) => r.name);
  }

  return context;
}

export async function aggregate(): Promise<AggregatedData> {
  console.log("Starting aggregation...\n");

  // Load identity and about
  const identityRaw = await readFile("data/identity.json", "utf-8");
  const identity: Identity = JSON.parse(identityRaw);

  const aboutRaw = await readFile("data/about.json", "utf-8");
  const about: About = JSON.parse(aboutRaw);

  console.log("Loaded identity and about data");

  const sources: AggregatedData["sources"] = {};
  const analysis: AggregatedData["analysis"] = {};
  const fetchResults: FetchSourceResult[] = [];

  // Add About to fetch results
  fetchResults.push({
    name: "About",
    status: "success",
    summary: about.headline || "Bio loaded",
  });

  // =========================================================================
  // GitHub
  // =========================================================================
  console.log("Fetching GitHub data...");
  try {
    const github = await fetchGitHubData(
      identity.github,
      process.env.GITHUB_TOKEN
    );
    sources.github = github;

    // Save to history
    await saveSnapshot("github", github);
    console.log("  Saved GitHub snapshot to history");

    // Load history and compute baseline
    const githubHistory = await getRecentSnapshots<GitHubData>("github", 12);
    console.log(`  Loaded ${githubHistory.length} weeks of GitHub history`);

    const githubAnalysis = computeGitHubBaseline(
      github,
      githubHistory.slice(1) // Exclude current week (we just saved it)
    );
    analysis.github = githubAnalysis;
    console.log("  GitHub analysis complete");

    fetchResults.push({
      name: "GitHub",
      status: "success",
      summary: summarizeGitHub(github),
    });
  } catch (err) {
    console.error("  Failed to fetch GitHub data:", (err as Error).message);
    fetchResults.push({
      name: "GitHub",
      status: "failure",
      error: (err as Error).message,
    });
  }

  // =========================================================================
  // Spotify (optional)
  // =========================================================================
  if (hasSpotifyCredentials()) {
    console.log("\nFetching Spotify data...");
    try {
      const spotify = await fetchSpotifyDataFromEnv();
      if (spotify) {
        sources.spotify = spotify;

        // Save to history
        await saveSnapshot("spotify", spotify);
        console.log("  Saved Spotify snapshot to history");

        // Load history and compute baseline
        const spotifyHistory = await getRecentSnapshots<SpotifyData>(
          "spotify",
          12
        );
        console.log(`  Loaded ${spotifyHistory.length} weeks of Spotify history`);

        const spotifyAnalysis = computeSpotifyBaseline(
          spotify,
          spotifyHistory.slice(1)
        );
        analysis.spotify = spotifyAnalysis;
        console.log("  Spotify analysis complete");

        fetchResults.push({
          name: "Spotify",
          status: "success",
          summary: summarizeSpotify(spotify),
        });
      }
    } catch (err) {
      console.error("  Failed to fetch Spotify data:", (err as Error).message);
      fetchResults.push({
        name: "Spotify",
        status: "failure",
        error: (err as Error).message,
      });
    }
  } else {
    console.log("\nSpotify credentials not configured, skipping");
    fetchResults.push({
      name: "Spotify",
      status: "skipped",
      summary: "credentials not configured",
    });
  }

  // =========================================================================
  // Typefully (optional) - X/Twitter posts
  // =========================================================================
  if (hasTypefullyCredentials()) {
    console.log("\nFetching Typefully data...");
    try {
      const typefully = await fetchTypefullyDataFromEnv();
      if (typefully) {
        sources.typefully = typefully;

        // Save to history
        await saveSnapshot("typefully", typefully);
        console.log("  Saved Typefully snapshot to history");

        // Load history and compute baseline
        const typefullyHistory = await getRecentSnapshots<TypefullyData>(
          "typefully",
          12
        );
        console.log(`  Loaded ${typefullyHistory.length} weeks of Typefully history`);

        const typefullyAnalysis = computeTypefullyBaseline(
          typefully,
          typefullyHistory.slice(1)
        );
        analysis.typefully = typefullyAnalysis;
        console.log("  Typefully analysis complete");

        fetchResults.push({
          name: "Typefully",
          status: "success",
          summary: summarizeTypefully(typefully),
        });
      }
    } catch (err) {
      console.error("  Failed to fetch Typefully data:", (err as Error).message);
      fetchResults.push({
        name: "Typefully",
        status: "failure",
        error: (err as Error).message,
      });
    }
  } else {
    console.log("\nTypefully API key not configured, skipping");
    fetchResults.push({
      name: "Typefully",
      status: "skipped",
      summary: "API key not configured",
    });
  }

  // =========================================================================
  // Weather (from location.json)
  // =========================================================================
  console.log("\nFetching weather data...");
  try {
    const weather = await fetchWeatherData();
    sources.weather = weather;

    fetchResults.push({
      name: "Weather",
      status: "success",
      summary: `${weather.location.description}: ${weather.current.temperature_c}°C, ${weather.current.conditions}`,
    });
  } catch (err) {
    console.error("  Failed to fetch weather data:", (err as Error).message);
    fetchResults.push({
      name: "Weather",
      status: "failure",
      error: (err as Error).message,
    });
  }

  // =========================================================================
  // Build final output
  // =========================================================================
  // Note: reference.html is fetched by the workflow directly to fly-context/
  // and passed to agents via artifacts. No need to load it here.

  const data: AggregatedData = {
    generated_at: new Date().toISOString(),
    identity,
    about,
    sources,
    analysis,
    context: {
      season: getSeason(),
    },
  };

  // Write to latest.json (full data for records/dashboards)
  await writeFile("data/latest.json", JSON.stringify(data, null, 2));

  // Write lightweight context.json (for agent prompts)
  const lightContext = buildLightContext(data);
  await writeFile("data/context.json", JSON.stringify(lightContext, null, 2));

  // Write fetch summary for build logs
  const fetchSummary: FetchSummary = {
    timestamp: new Date().toISOString(),
    sources: fetchResults,
  };
  await writeFile("data/fetch-summary.json", JSON.stringify(fetchSummary, null, 2));

  console.log("\n✓ Aggregation complete");
  console.log(`  Sources fetched: ${fetchResults.filter(r => r.status === "success").length}/${fetchResults.length}`);
  console.log(`  Wrote context.json (${JSON.stringify(lightContext).length} bytes)`);

  return data;
}

// CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
  aggregate()
    .then(() => {
      console.log("\nRaw data saved to data/latest.json");
      console.log("Run curator agent next to synthesize insights.");
    })
    .catch((err) => {
      console.error("Error:", err.message);
      process.exit(1);
    });
}
