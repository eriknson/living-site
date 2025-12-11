/**
 * Weather Fetcher
 * Fetches current weather from Open-Meteo API based on location.json
 * No API key required - Open-Meteo is free and open source
 */

import { readFile } from "fs/promises";

const OPEN_METEO_API = "https://api.open-meteo.com/v1/forecast";

interface LocationData {
  description: string;
  coordinates: {
    lat: number;
    lon: number;
  };
  updated_at: string;
}

interface OpenMeteoResponse {
  current_weather: {
    temperature: number;
    windspeed: number;
    winddirection: number;
    weathercode: number;
    is_day: number;
    time: string;
  };
  daily: {
    sunrise: string[];
    sunset: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

export interface WeatherData {
  fetched_at: string;
  location: {
    description: string;
    coordinates: { lat: number; lon: number };
    updated_at: string;
  };
  current: {
    temperature_c: number;
    feels_like_description: string;
    conditions: string;
    is_day: boolean;
    wind_speed_kmh: number;
  };
  today: {
    high_c: number;
    low_c: number;
    sunrise: string;
    sunset: string;
  };
}

/**
 * Convert WMO weather code to human-readable description
 * https://open-meteo.com/en/docs#weathervariables
 */
function weatherCodeToDescription(code: number, isDay: boolean): string {
  const descriptions: Record<number, string> = {
    0: "clear",
    1: "mostly clear",
    2: "partly cloudy",
    3: "overcast",
    45: "foggy",
    48: "foggy",
    51: "light drizzle",
    53: "drizzle",
    55: "heavy drizzle",
    56: "freezing drizzle",
    57: "freezing drizzle",
    61: "light rain",
    63: "rain",
    65: "heavy rain",
    66: "freezing rain",
    67: "freezing rain",
    71: "light snow",
    73: "snow",
    75: "heavy snow",
    77: "snow grains",
    80: "light showers",
    81: "showers",
    82: "heavy showers",
    85: "light snow showers",
    86: "snow showers",
    95: "thunderstorm",
    96: "thunderstorm with hail",
    99: "thunderstorm with heavy hail",
  };

  return descriptions[code] || "unknown";
}

/**
 * Get a qualitative description of temperature
 */
function getFeelsLikeDescription(tempC: number): string {
  if (tempC <= -10) return "bitterly cold";
  if (tempC <= 0) return "freezing";
  if (tempC <= 5) return "cold";
  if (tempC <= 10) return "chilly";
  if (tempC <= 15) return "cool";
  if (tempC <= 20) return "mild";
  if (tempC <= 25) return "warm";
  if (tempC <= 30) return "hot";
  return "very hot";
}

/**
 * Load location from data/location.json
 */
export async function loadLocation(): Promise<LocationData> {
  const content = await readFile("data/location.json", "utf-8");
  return JSON.parse(content) as LocationData;
}

/**
 * Fetch weather data from Open-Meteo
 */
export async function fetchWeatherData(): Promise<WeatherData> {
  const location = await loadLocation();
  const { lat, lon } = location.coordinates;

  const url = new URL(OPEN_METEO_API);
  url.searchParams.set("latitude", lat.toString());
  url.searchParams.set("longitude", lon.toString());
  url.searchParams.set("current_weather", "true");
  url.searchParams.set("daily", "sunrise,sunset,temperature_2m_max,temperature_2m_min");
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as OpenMeteoResponse;
  const current = data.current_weather;
  const daily = data.daily;

  return {
    fetched_at: new Date().toISOString(),
    location: {
      description: location.description,
      coordinates: location.coordinates,
      updated_at: location.updated_at,
    },
    current: {
      temperature_c: Math.round(current.temperature),
      feels_like_description: getFeelsLikeDescription(current.temperature),
      conditions: weatherCodeToDescription(current.weathercode, current.is_day === 1),
      is_day: current.is_day === 1,
      wind_speed_kmh: Math.round(current.windspeed),
    },
    today: {
      high_c: Math.round(daily.temperature_2m_max[0]),
      low_c: Math.round(daily.temperature_2m_min[0]),
      sunrise: daily.sunrise[0],
      sunset: daily.sunset[0],
    },
  };
}

// CLI runner for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchWeatherData()
    .then((data) => {
      console.log(JSON.stringify(data, null, 2));
    })
    .catch((err) => {
      console.error("Error:", err.message);
      process.exit(1);
    });
}
