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
  about: string;
  philosophy: {
    core: string;
    approach: string[];
    how_i_build: string[];
  };
  values: string[];
  beliefs: string[];
  interests: string[];
}

interface FetchSourceResult {
  name: string;
  status: "success" | "failure" | "skipped";
  error?: string;
  summary?: string;
}

export interface FetchSummary {
  timestamp: string;
  sources: FetchSourceResult[];
}

function summarizeGitHub(data: GitHubData): string {
  const topLang = Object.entries(data.languages)
    .sort((a, b) => b[1] - a[1])[0];
  const parts = [
    `${data.recent_activity.total_events} events`,
    `${data.recent_activity.repos_touched.length} repos touched`,
  ];
  if (topLang) {
    parts.push(`top: ${topLang[0]} (${topLang[1]} repos)`);
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
  narrative_signals: string[];
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

async function loadPreviousSignals(): Promise<string[] | null> {
  try {
    const content = await readFile("data/latest.json", "utf-8");
    const data = JSON.parse(content) as AggregatedData;
    return data.narrative_signals || null;
  } catch {
    return null;
  }
}

function calculateDaysSinceChange(
  previousSignals: string[] | null,
  currentSignals: string[]
): number {
  if (!previousSignals) return 0;

  // Check if signals have meaningfully changed
  const prevSet = new Set(previousSignals);
  const currSet = new Set(currentSignals);

  // If more than 30% of signals are new, consider it changed
  const newSignals = [...currSet].filter((s) => !prevSet.has(s));
  if (newSignals.length / currentSignals.length > 0.3) return 0;

  // Load previous days_since_change
  try {
    const content = require("fs").readFileSync("data/latest.json", "utf-8");
    const data = JSON.parse(content) as AggregatedData;
    return (data.context?.days_since_change || 0) + 1;
  } catch {
    return 0;
  }
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
  const allNarrativeSignals: string[] = [];
  const fetchResults: FetchSourceResult[] = [];

  // Add About to fetch results
  fetchResults.push({
    name: "About",
    status: "success",
    summary: about.headline || "Bio & values loaded",
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
    allNarrativeSignals.push(...githubAnalysis.narrative_signals);

    console.log("  GitHub signals:", githubAnalysis.narrative_signals);

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
        allNarrativeSignals.push(...spotifyAnalysis.narrative_signals);

        console.log("  Spotify signals:", spotifyAnalysis.narrative_signals);

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
        allNarrativeSignals.push(...typefullyAnalysis.narrative_signals);

        console.log("  Typefully signals:", typefullyAnalysis.narrative_signals);

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

    // Add weather-based narrative signals
    const weatherSignals: string[] = [];
    weatherSignals.push(`last seen in ${weather.location.description}`);
    weatherSignals.push(
      `${weather.current.conditions}, ${weather.current.temperature_c}°C`
    );

    allNarrativeSignals.push(...weatherSignals);
    console.log("  Weather signals:", weatherSignals);

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

  // Load previous signals for change detection
  const previousSignals = await loadPreviousSignals();
  const daysSinceChange = calculateDaysSinceChange(
    previousSignals,
    allNarrativeSignals
  );

  const data: AggregatedData = {
    generated_at: new Date().toISOString(),
    identity,
    about,
    sources,
    analysis,
    narrative_signals: allNarrativeSignals,
    context: {
      season: getSeason(),
      days_since_change: daysSinceChange,
    },
  };

  // Write to latest.json
  await writeFile("data/latest.json", JSON.stringify(data, null, 2));

  // Write fetch summary for build logs
  const fetchSummary: FetchSummary = {
    timestamp: new Date().toISOString(),
    sources: fetchResults,
  };
  await writeFile("data/fetch-summary.json", JSON.stringify(fetchSummary, null, 2));

  console.log("\n✓ Aggregation complete");
  console.log(`  Total narrative signals: ${allNarrativeSignals.length}`);
  console.log(`  Days since meaningful change: ${daysSinceChange}`);

  return data;
}

// CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
  aggregate()
    .then((data) => {
      console.log("\n=== Narrative Signals ===");
      for (const signal of data.narrative_signals) {
        console.log(`  • ${signal}`);
      }
    })
    .catch((err) => {
      console.error("Error:", err.message);
      process.exit(1);
    });
}
