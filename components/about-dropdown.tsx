"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Manifest } from "@/lib/manifest";
import { formatDuration, getModelDisplayName, getBuildForModel, getBuiltAt, formatRelativeTime } from "@/lib/manifest";
import { ArrowUpRight } from "lucide-react";

interface DataSource {
  name: string;
  status: string;
  summary: string;
}

interface FetchSummary {
  timestamp: string;
  sources: DataSource[];
}

interface AboutDropdownProps {
  manifest: Manifest | null;
  currentModel?: string | null;
  currentDate?: string | null;
}

function parseContextFromSources(sources: DataSource[]): {
  github: string | null;
  spotify: string | null;
  twitter: string | null;
  weather: string | null;
} {
  const result = {
    github: null as string | null,
    spotify: null as string | null,
    twitter: null as string | null,
    weather: null as string | null,
  };

  for (const source of sources) {
    if (source.status !== "success") continue;

    if (source.name === "GitHub") {
      // "46 events, 4 repos touched, top: TypeScript (8 repos)"
      const eventsMatch = source.summary.match(/^(\d+)\s+events?/);
      if (eventsMatch) {
        result.github = `${eventsMatch[1]} events on GitHub`;
      }
    } else if (source.name === "Spotify") {
      // "Top artist: The Weeknd, genre: french indie pop"
      const artistMatch = source.summary.match(/Top artist:\s*([^,]+)/);
      if (artistMatch) {
        result.spotify = `Listening to ${artistMatch[1].trim()}`;
      }
    } else if (source.name === "Typefully") {
      // "12 posts, 3 this week"
      const weekMatch = source.summary.match(/(\d+)\s+this\s+week/);
      if (weekMatch) {
        const count = parseInt(weekMatch[1], 10);
        result.twitter = `${count} ${count === 1 ? "post" : "posts"} on X`;
      }
    } else if (source.name === "Weather") {
      // "Stockholm, Sweden: 3°C, overcast"
      const weatherMatch = source.summary.match(/([^:]+):\s*(-?\d+)°C/);
      if (weatherMatch) {
        const city = weatherMatch[1].split(",")[0].trim();
        result.weather = `${weatherMatch[2]}°C in ${city}`;
      }
    }
  }

  return result;
}

export function AboutDropdown({ manifest, currentModel, currentDate }: AboutDropdownProps) {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);

  // Fetch data sources
  useEffect(() => {
    fetch("/data/fetch-summary.json")
      .then((res) => res.json())
      .then((data: FetchSummary) => setDataSources(data.sources))
      .catch(() => setDataSources([]));
  }, []);

  // Get the build for the currently displayed model/date
  const displayModel = currentModel || manifest?.default_model;
  const displayDate = currentDate || manifest?.latest_date;
  const currentBuild = manifest && displayModel && displayDate
    ? getBuildForModel(manifest, displayModel, displayDate)
    : null;
  const builtAt = manifest ? getBuiltAt(manifest, displayDate ?? undefined) : undefined;

  // Format "Made by" value
  const modelName = displayModel ? getModelDisplayName(displayModel) : "—";
  const durationStr = currentBuild?.duration_ms ? ` in ${formatDuration(currentBuild.duration_ms)}` : "";

  // Format "Updated" value
  const updatedValue = builtAt ? formatRelativeTime(builtAt) : "—";

  // Parse context items
  const context = parseContextFromSources(dataSources);
  const contextItems = [
    context.github,
    context.spotify,
    context.twitter,
    context.weather,
  ].filter(Boolean);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-full px-2.5 font-semibold hover:bg-black/5 active:bg-black/10 outline-none flex items-center">
          eriks.design
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[280px]">
        {/* Description */}
        <div className="px-3 py-2.5 text-[13px] text-black/60 leading-relaxed">
          Regenerates daily via Cursor CLI agents running on GitHub Actions. Redeploys via Vercel.
        </div>

        <DropdownMenuSeparator />

        {/* Made by / Updated */}
        <div className="px-3 py-2.5 space-y-1">
          <div className="flex justify-between items-baseline text-[13px]">
            <span className="text-black/50">Made by</span>
            <span className="text-black/90 tabular-nums">
              {modelName}
              {durationStr && <span className="text-black/50">{durationStr}</span>}
            </span>
          </div>
          <div className="flex justify-between items-baseline text-[13px]">
            <span className="text-black/50">Updated</span>
            <span className="text-black/90 tabular-nums">{updatedValue}</span>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Context */}
        <div className="px-3 py-2.5">
          <div className="text-[10px] font-semibold tracking-widest text-black/40 uppercase mb-2">
            Context
          </div>
          <div className="space-y-1">
            {contextItems.map((item, i) => (
              <div key={i} className="text-[13px] text-black/70">
                {item}
              </div>
            ))}
            {contextItems.length === 0 && (
              <div className="text-[13px] text-black/40 italic">
                No context available
              </div>
            )}
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Links */}
        <div className="px-1 py-1">
          <Link
            href="/builds"
            className="flex items-center justify-between px-2 py-2 rounded-sm text-[13px] text-black/80 hover:bg-black/5 active:bg-black/10 transition-colors"
          >
            Build History
          </Link>
          <a
            href="https://github.com/eriknson/living-site"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-2 py-2 rounded-sm text-[13px] text-black/80 hover:bg-black/5 active:bg-black/10 transition-colors"
          >
            <span>Source Code</span>
            <ArrowUpRight className="h-3.5 w-3.5 text-black/40" />
          </a>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
