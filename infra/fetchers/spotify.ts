/**
 * Spotify Fetcher
 * Fetches user's top artists and tracks at multiple time scales
 * Uses OAuth refresh token flow for authentication
 */

const SPOTIFY_API = "https://api.spotify.com/v1";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";

// Spotify's built-in time ranges map perfectly to our identity model:
// - long_term (~1 year) → identity - who you are
// - medium_term (~6 months) → current phase
// - short_term (~4 weeks) → recent

type TimeRange = "long_term" | "medium_term" | "short_term";

interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  popularity: number;
}

export interface Artist {
  id: string;
  name: string;
  genres: string[];
}

export interface Track {
  id: string;
  name: string;
  artist: string;
}

export interface TimeRangeData {
  artists: Artist[];
  tracks: Track[];
  genres: string[]; // Aggregated from artists
}

export interface SpotifyData {
  fetched_at: string;
  long_term: TimeRangeData; // ~1 year - identity
  medium_term: TimeRangeData; // ~6 months - current phase
  short_term: TimeRangeData; // ~4 weeks - recent
}

/**
 * Get a fresh access token using the refresh token
 */
async function getAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: params,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh Spotify token: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Fetch JSON from Spotify API with authentication
 */
async function fetchSpotifyAPI<T>(
  endpoint: string,
  accessToken: string
): Promise<T> {
  const response = await fetch(`${SPOTIFY_API}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Spotify API error: ${response.status} ${error}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Fetch top artists for a time range
 */
async function fetchTopArtists(
  accessToken: string,
  timeRange: TimeRange,
  limit: number = 20
): Promise<Artist[]> {
  const data = await fetchSpotifyAPI<{ items: SpotifyArtist[] }>(
    `/me/top/artists?time_range=${timeRange}&limit=${limit}`,
    accessToken
  );

  return data.items.map((artist) => ({
    id: artist.id,
    name: artist.name,
    genres: artist.genres,
  }));
}

/**
 * Fetch top tracks for a time range
 */
async function fetchTopTracks(
  accessToken: string,
  timeRange: TimeRange,
  limit: number = 20
): Promise<Track[]> {
  const data = await fetchSpotifyAPI<{ items: SpotifyTrack[] }>(
    `/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
    accessToken
  );

  return data.items.map((track) => ({
    id: track.id,
    name: track.name,
    artist: track.artists.map((a) => a.name).join(", "),
  }));
}

/**
 * Aggregate genres from artists, ranked by frequency
 */
function aggregateGenres(artists: Artist[]): string[] {
  const genreCounts = new Map<string, number>();

  for (const artist of artists) {
    for (const genre of artist.genres) {
      genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
    }
  }

  return [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([genre]) => genre);
}

/**
 * Fetch data for a specific time range
 */
async function fetchTimeRangeData(
  accessToken: string,
  timeRange: TimeRange
): Promise<TimeRangeData> {
  const [artists, tracks] = await Promise.all([
    fetchTopArtists(accessToken, timeRange),
    fetchTopTracks(accessToken, timeRange),
  ]);

  const genres = aggregateGenres(artists);

  return { artists, tracks, genres };
}

/**
 * Main fetch function - gets data for all time ranges
 */
export async function fetchSpotifyData(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<SpotifyData> {
  // Get fresh access token
  const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

  // Fetch all time ranges in parallel
  const [longTerm, mediumTerm, shortTerm] = await Promise.all([
    fetchTimeRangeData(accessToken, "long_term"),
    fetchTimeRangeData(accessToken, "medium_term"),
    fetchTimeRangeData(accessToken, "short_term"),
  ]);

  return {
    fetched_at: new Date().toISOString(),
    long_term: longTerm,
    medium_term: mediumTerm,
    short_term: shortTerm,
  };
}

/**
 * Check if Spotify credentials are available
 */
export function hasSpotifyCredentials(): boolean {
  return !!(
    process.env.SPOTIFY_CLIENT_ID &&
    process.env.SPOTIFY_CLIENT_SECRET &&
    process.env.SPOTIFY_REFRESH_TOKEN
  );
}

/**
 * Fetch Spotify data using environment variables
 */
export async function fetchSpotifyDataFromEnv(): Promise<SpotifyData | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.log("Spotify credentials not configured, skipping");
    return null;
  }

  return fetchSpotifyData(clientId, clientSecret, refreshToken);
}

// CLI runner for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchSpotifyDataFromEnv()
    .then((data) => {
      if (data) {
        console.log(JSON.stringify(data, null, 2));
      } else {
        console.log("No Spotify data (credentials not configured)");
      }
    })
    .catch((err) => {
      console.error("Error:", err.message);
      process.exit(1);
    });
}

