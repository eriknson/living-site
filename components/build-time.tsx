"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, History, Check, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDuration, formatRelativeTime, getBuiltAt, getModelDisplayName, getBuildForModel, type Manifest } from "@/lib/manifest";

interface DataSource {
  name: string;
  status: "success" | "error";
  summary: string;
}

interface FetchSummary {
  timestamp: string;
  sources: DataSource[];
}

interface ContextItem {
  label: string;
  value: string;
  status: "success" | "error";
}

function parseContextFromSources(sources: DataSource[]): ContextItem[] {
  const items: ContextItem[] = [];

  for (const source of sources) {
    if (source.name === "About") {
      items.push({
        label: "About",
        value: "Bio and identity",
        status: source.status,
      });
    } else if (source.name === "GitHub") {
      // "46 events, 4 repos touched, top: TypeScript (8 repos)"
      const eventsMatch = source.summary.match(/^(\d+)\s+events?/);
      items.push({
        label: "GitHub",
        value: eventsMatch ? `${eventsMatch[1]} events from GitHub` : source.summary,
        status: source.status,
      });
    } else if (source.name === "Spotify") {
      // "Top artist: The Weeknd, genre: french indie pop"
      items.push({
        label: "Spotify",
        value: "Listening history from Spotify",
        status: source.status,
      });
    } else if (source.name === "Typefully") {
      // "12 posts, 3 this week"
      const totalMatch = source.summary.match(/^(\d+)\s+posts?/);
      items.push({
        label: "X",
        value: totalMatch ? `${totalMatch[1]} posts from X` : source.summary,
        status: source.status,
      });
    } else if (source.name === "Weather") {
      // "Stockholm, Sweden: 3°C, overcast"
      const weatherMatch = source.summary.match(/([^:]+):\s*(-?\d+)°C/);
      items.push({
        label: "Weather",
        value: weatherMatch ? `${weatherMatch[2]}°C in ${weatherMatch[1].trim()}` : source.summary,
        status: source.status,
      });
    }
  }

  return items;
}

interface BuildTimeProps {
  manifest: Manifest | null;
  currentModel?: string | null;
  currentDate?: string | null;
  currentTimestamp?: string | null;
}

export function BuildTime({ manifest, currentModel, currentDate, currentTimestamp }: BuildTimeProps) {
  const [relativeTime, setRelativeTime] = useState<string>("");
  const [dataSources, setDataSources] = useState<DataSource[]>([]);

  useEffect(() => {
    if (!manifest) return;

    const builtAt = getBuiltAt(manifest, currentDate ?? undefined, currentTimestamp ?? undefined);
    if (!builtAt) return;

    const updateTime = () => {
      setRelativeTime(formatRelativeTime(builtAt));
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [manifest, currentDate, currentTimestamp]);

  useEffect(() => {
    fetch("/data/fetch-summary.json")
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data: FetchSummary) => {
        setDataSources(data.sources);
      })
      .catch(() => setDataSources([]));
  }, []);

  // Get the build for the currently displayed model/date
  const displayModel = currentModel || manifest?.default_model;
  const displayDate = currentDate || manifest?.latest_date;
  const currentBuild = manifest && displayModel && displayDate
    ? getBuildForModel(manifest, displayModel, displayDate, currentTimestamp ?? undefined)
    : null;

  // Format "Made by" value
  const modelName = displayModel ? getModelDisplayName(displayModel) : "—";
  const durationStr = currentBuild?.duration_ms ? ` in ${formatDuration(currentBuild.duration_ms)}` : "";

  // Parse context items
  const contextItems = parseContextFromSources(dataSources);

  if (!relativeTime) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-full px-2.5 text-black/60 hover:bg-black/5 active:bg-black/10 outline-none flex items-center cursor-pointer">
          Built {relativeTime}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px]">
        {/* Description */}
        <div className="px-3 py-2.5 text-[13px] text-black/60 leading-relaxed">
          This website regenerates daily via Cursor CLI agents running on GitHub Actions. Redeploys via Vercel automagically.
        </div>

        <DropdownMenuSeparator />

        {/* Made by / Updated */}
        <div className="px-3 py-2.5 space-y-1">
          <div className="flex justify-between items-baseline text-[13px]">
            <span className="text-black/50">Made by</span>
            <span className="text-black/90">
              {modelName}
              {durationStr && <span className="text-black/50">{durationStr}</span>}
            </span>
          </div>
          <div className="flex justify-between items-baseline text-[13px]">
            <span className="text-black/50">Updated</span>
            <span className="text-black/90">{relativeTime}</span>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Context */}
        <div className="px-3 py-2.5 space-y-1.5">
          <div className="text-[13px] text-black/50">
            Context
          </div>
          {contextItems.map((item) => (
            <div key={item.label} className="flex items-start gap-3 text-[13px]">
              <span className="flex-1 text-black/80 leading-snug">{item.value}</span>
              {item.status === "success" ? (
                <Check className="h-3.5 w-3.5 text-black/20 shrink-0 mt-0.5" />
              ) : (
                <X className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
              )}
            </div>
          ))}
          {contextItems.length === 0 && (
            <div className="text-[13px] text-black/40 italic">
              No context available
            </div>
          )}
        </div>

        <DropdownMenuSeparator />

        {/* Links */}
        <div className="px-1 py-1">
          <Link
            href="/builds"
            className="flex items-center justify-between px-2 py-2 rounded-sm text-[13px] text-black/80 hover:bg-black/5 active:bg-black/10 transition-colors"
          >
            <span>Build History</span>
            <History className="h-3.5 w-3.5 text-black/40" />
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

