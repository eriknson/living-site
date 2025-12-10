/**
 * Spotify Baseline Computer
 * Computes identity vs. current-phase patterns from Spotify listening data
 *
 * Unique advantage: Spotify already provides time-scaled data (long_term, medium_term, short_term)
 * so we can compare across their built-in scales AND our own weekly history
 */

import type { SpotifyData, Artist } from "../fetchers/spotify.js";
import type { Snapshot } from "../history.js";
import {
  type SourceAnalysis,
  calculateListStability,
  jaccardSimilarity,
  findNewItems,
  findCoreItems,
  calculateDiscoveryRate,
} from "../baseline.js";

/**
 * Compute baseline analysis for Spotify data
 */
export function computeSpotifyBaseline(
  current: SpotifyData,
  history: Snapshot<SpotifyData>[]
): SourceAnalysis {
  const narrativeSignals: string[] = [];

  // Extract data at different scales from current fetch
  const longTermGenres = current.long_term.genres;
  const mediumTermGenres = current.medium_term.genres;
  const shortTermGenres = current.short_term.genres;

  const longTermArtists = current.long_term.artists.map((a) => a.name);
  const mediumTermArtists = current.medium_term.artists.map((a) => a.name);
  const shortTermArtists = current.short_term.artists.map((a) => a.name);

  // Calculate genre stability using Spotify's built-in time ranges
  const genreStabilityLongToMedium = jaccardSimilarity(
    new Set(longTermGenres.slice(0, 10)),
    new Set(mediumTermGenres.slice(0, 10))
  );
  const genreStabilityMediumToShort = jaccardSimilarity(
    new Set(mediumTermGenres.slice(0, 10)),
    new Set(shortTermGenres.slice(0, 10))
  );

  // Also check stability across our own history
  const historicalTopGenres = history.map((s) =>
    s.data.long_term.genres.slice(0, 10)
  );
  const historicalStability = calculateListStability(
    [longTermGenres.slice(0, 10), ...historicalTopGenres],
    10
  );

  // Overall stability combines Spotify's scale comparison and our history
  const stabilityScore =
    genreStabilityLongToMedium * 0.3 +
    genreStabilityMediumToShort * 0.3 +
    historicalStability * 0.4;

  // Find core genres (consistently in top across all time ranges)
  const coreGenres = findCoreItems(
    [longTermGenres.slice(0, 15), mediumTermGenres.slice(0, 15)],
    0.8
  );

  // Find core artists
  const coreArtists = findCoreItems(
    [longTermArtists.slice(0, 10), mediumTermArtists.slice(0, 10)],
    0.7
  );

  // Find new explorations (in short-term but not long-term)
  const newGenres = findNewItems(
    shortTermGenres.slice(0, 10),
    longTermGenres.slice(0, 20)
  );
  const newArtists = findNewItems(
    shortTermArtists.slice(0, 10),
    longTermArtists.slice(0, 20)
  );

  // Calculate discovery rate
  const genreDiscoveryRate = calculateDiscoveryRate(
    shortTermGenres.slice(0, 10),
    longTermGenres.slice(0, 20)
  );
  const artistDiscoveryRate = calculateDiscoveryRate(
    shortTermArtists.slice(0, 10),
    longTermArtists.slice(0, 20)
  );

  // Generate narrative signals

  // Core taste identity
  if (coreGenres.length > 0) {
    const genreStr = coreGenres.slice(0, 3).join(", ");
    if (stabilityScore > 0.7) {
      narrativeSignals.push(`consistently drawn to ${genreStr}`);
    } else {
      narrativeSignals.push(`core taste includes ${genreStr}`);
    }
  }

  // Exploration signals
  if (newGenres.length > 0 && genreDiscoveryRate > 0.2) {
    const newGenreStr = newGenres.slice(0, 2).join(" and ");
    narrativeSignals.push(`recently exploring ${newGenreStr} (new for you)`);
  }

  if (newArtists.length > 0 && artistDiscoveryRate > 0.3) {
    const newArtistStr = newArtists.slice(0, 2).join(" and ");
    narrativeSignals.push(`discovering new artists like ${newArtistStr}`);
  }

  // Stability/variety signals
  if (stabilityScore > 0.8) {
    narrativeSignals.push("listening patterns very consistent — you know what you like");
  } else if (stabilityScore < 0.5) {
    narrativeSignals.push("eclectic listener — taste varies widely");
  }

  // Phase shift detection (comparing medium to long)
  if (genreStabilityLongToMedium < 0.5) {
    const shiftedTo = mediumTermGenres
      .filter((g) => !longTermGenres.slice(0, 10).includes(g))
      .slice(0, 2);
    if (shiftedTo.length > 0) {
      narrativeSignals.push(
        `musical taste shifting toward ${shiftedTo.join(" and ")}`
      );
    }
  }

  // If no strong signals, add a default
  if (narrativeSignals.length === 0 && longTermGenres.length > 0) {
    narrativeSignals.push(`listening to ${longTermGenres.slice(0, 3).join(", ")}`);
  }

  return {
    identity: {
      core_genres: coreGenres,
      core_artists: coreArtists,
      genre_stability: stabilityScore,
      listening_style:
        artistDiscoveryRate > 0.4
          ? "explorer"
          : artistDiscoveryRate < 0.1
            ? "deep-diver"
            : "balanced",
    },
    current_phase: {
      top_genres: mediumTermGenres.slice(0, 10),
      top_artists: mediumTermArtists.slice(0, 10),
      new_explorations: {
        genres: newGenres,
        artists: newArtists,
      },
      discovery_rate: {
        genres: genreDiscoveryRate,
        artists: artistDiscoveryRate,
      },
    },
    stability_score: stabilityScore,
    narrative_signals: narrativeSignals,
  };
}

