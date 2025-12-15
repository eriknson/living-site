/**
 * Doodle Picker
 * Selects a hand-drawn doodle SVG based on aggregated data signals
 */

import { readFile, readdir } from "fs/promises";
import { join } from "path";

const DOODLES_BASE = "public/doodles/SVG";

// Map conditions to folder/filename patterns
const WEATHER_DOODLES: Record<string, string[]> = {
  rain: ["weather/rain-light.svg", "weather/rain-heavy.svg"],
  snow: ["weather/snow.svg", "weather/snowflake.svg", "weather/snowman.svg"],
  sunny: ["weather/sunny.svg", "interface/sun.svg", "interface/sun-2.svg"],
  clear: ["weather/sunny.svg", "interface/sun.svg"],
  overcast: ["weather/cloudy-day.svg", "interface/cloud.svg"],
  cloudy: ["weather/cloudy-day.svg", "interface/cloud.svg"],
  storm: ["weather/thunderstorm.svg"],
  wind: ["weather/wind.svg"],
  night: ["weather/night.svg", "weather/cloudy-night.svg", "interface/star.svg"],
};

const ENERGY_DOODLES: Record<string, string[]> = {
  shipping: [
    "misc/rocket.svg",
    "misc/fire.svg",
    "interface/zap.svg",
    "interface/target.svg",
  ],
  exploring: [
    "interface/search.svg",
    "interface/globe.svg",
    "interface/map.svg",
    "misc/hot-air-balloon.svg",
    "interface/navigation.svg",
  ],
  reflective: [
    "misc/coffee-cup-1.svg",
    "misc/coffee-cup-2.svg",
    "interface/bulb.svg",
    "interface/note.svg",
    "interface/pencil.svg",
  ],
  quiet: [
    "weather/night.svg",
    "interface/star.svg",
    "misc/coffee-cup-1.svg",
  ],
};

const MUSIC_DOODLES: Record<string, string[]> = {
  electronic: ["interface/headphone.svg", "interface/speaker.svg", "interface/zap.svg"],
  house: ["interface/headphone.svg", "interface/music.svg", "interface/speaker.svg"],
  "dream pop": ["interface/cloud.svg", "interface/star.svg", "weather/cloudy-day.svg"],
  "trip hop": ["weather/night.svg", "interface/headphone.svg"],
  indie: ["interface/music.svg", "interface/headphone.svg", "objects/guitar.svg"],
  rap: ["interface/mic.svg", "interface/headphone.svg", "interface/speaker.svg"],
  downtempo: ["misc/coffee-cup-1.svg", "interface/headphone.svg"],
  ambient: ["interface/cloud.svg", "interface/star.svg"],
};

const SEASON_DOODLES: Record<string, string[]> = {
  winter: [
    "weather/snow.svg",
    "weather/snowflake.svg",
    "misc/coffee-cup-1.svg",
    "misc/coffee-cup-2.svg",
  ],
  spring: ["interface/sun.svg", "interface/tree.svg", "weather/rain-light.svg"],
  summer: ["weather/sunny.svg", "interface/sun-2.svg"],
  autumn: ["weather/wind.svg", "weather/cloudy-day.svg", "misc/coffee-cup-1.svg"],
};

// Fallback doodles that work for any situation
const FALLBACK_DOODLES = [
  "misc/coffee-cup-1.svg",
  "misc/coffee-cup-2.svg",
  "interface/bulb.svg",
  "interface/star.svg",
  "interface/heart.svg",
  "interface/home.svg",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface DoodleConditions {
  weather?: string;
  isDay?: boolean;
  energy?: "shipping" | "exploring" | "reflective" | "quiet";
  season?: string;
  topGenre?: string;
}

export async function pickDoodle(conditions: DoodleConditions): Promise<{
  svg: string;
  source: string;
}> {
  const candidates: string[] = [];

  // Add weather-based candidates (highest priority for visual coherence)
  if (conditions.weather) {
    const weatherKey = conditions.weather.toLowerCase();
    for (const [pattern, doodles] of Object.entries(WEATHER_DOODLES)) {
      if (weatherKey.includes(pattern)) {
        candidates.push(...doodles);
        break;
      }
    }
  }

  // Add night-specific if not daytime
  if (conditions.isDay === false) {
    candidates.push(...WEATHER_DOODLES.night);
  }

  // Add energy-based candidates
  if (conditions.energy && ENERGY_DOODLES[conditions.energy]) {
    candidates.push(...ENERGY_DOODLES[conditions.energy]);
  }

  // Add music-based candidates
  if (conditions.topGenre) {
    const genreLower = conditions.topGenre.toLowerCase();
    for (const [genre, doodles] of Object.entries(MUSIC_DOODLES)) {
      if (genreLower.includes(genre) || genre.includes(genreLower)) {
        candidates.push(...doodles);
        break;
      }
    }
  }

  // Add season-based candidates
  if (conditions.season && SEASON_DOODLES[conditions.season]) {
    candidates.push(...SEASON_DOODLES[conditions.season]);
  }

  // Use fallbacks if no candidates found
  const pool = candidates.length > 0 ? candidates : FALLBACK_DOODLES;

  // Pick one randomly from the pool
  const selected = pickRandom(pool);
  const fullPath = join(DOODLES_BASE, selected);

  try {
    const svg = await readFile(fullPath, "utf-8");
    return { svg, source: selected };
  } catch (err) {
    // If selected file doesn't exist, try a fallback
    console.warn(`Doodle not found: ${fullPath}, using fallback`);
    const fallback = pickRandom(FALLBACK_DOODLES);
    const fallbackPath = join(DOODLES_BASE, fallback);
    const svg = await readFile(fallbackPath, "utf-8");
    return { svg, source: fallback };
  }
}

// CLI test
if (import.meta.url === `file://${process.argv[1]}`) {
  pickDoodle({
    weather: "overcast",
    isDay: false,
    energy: "exploring",
    season: "winter",
    topGenre: "dream pop",
  }).then((result) => {
    console.log("Selected:", result.source);
    console.log("SVG length:", result.svg.length);
  });
}

