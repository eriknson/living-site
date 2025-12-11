"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, History, Check, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelativeTime, getBuiltAt, type Manifest } from "@/lib/manifest";

interface DataSource {
  name: string;
  status: "success" | "error";
  summary: string;
}

interface FetchSummary {
  timestamp: string;
  sources: DataSource[];
}

// Display names for sources
const SOURCE_DISPLAY: Record<string, string> = {
  GitHub: "GitHub",
  Spotify: "Spotify", 
  Typefully: "X",
  Weather: "Weather",
  About: "About",
};

interface BuildTimeProps {
  manifest: Manifest | null;
  currentDate?: string | null;
}

export function BuildTime({ manifest, currentDate }: BuildTimeProps) {
  const [relativeTime, setRelativeTime] = useState<string>("");
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [dataTimestamp, setDataTimestamp] = useState<string>("");
  const [dataRelativeTime, setDataRelativeTime] = useState<string>("");

  useEffect(() => {
    if (!manifest) return;

    const builtAt = getBuiltAt(manifest, currentDate ?? undefined);
    if (!builtAt) return;

    const updateTime = () => {
      setRelativeTime(formatRelativeTime(builtAt));
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [manifest, currentDate]);

  useEffect(() => {
    fetch("/data/fetch-summary.json")
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data: FetchSummary) => {
        setDataSources(data.sources);
        setDataTimestamp(data.timestamp);
      })
      .catch(() => setDataSources([]));
  }, []);

  // Update data layer relative time
  useEffect(() => {
    if (!dataTimestamp) return;

    const updateDataTime = () => {
      setDataRelativeTime(formatRelativeTime(dataTimestamp));
    };

    updateDataTime();
    const interval = setInterval(updateDataTime, 60000);
    return () => clearInterval(interval);
  }, [dataTimestamp]);

  if (!relativeTime) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-full px-2.5 text-black/60 hover:bg-black/5 active:bg-black/10 outline-none flex items-center cursor-pointer">
          Built {relativeTime}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <div className="px-2 py-2 text-sm text-black/70 leading-relaxed">
          <p>
            This site rebuilds itself daily. Three Cursor CLI agents run on GitHub Actions each morning to generate a fresh version of the website.
          </p>
        </div>

        {dataSources.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-black/50 text-xs uppercase tracking-wide">Data Layer</span>
                {dataRelativeTime && (
                  <span className="text-black/40 text-xs">Fetched {dataRelativeTime}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {dataSources.map((source) => {
                  const isOk = source.status === "success";
                  const displayName = SOURCE_DISPLAY[source.name] || source.name;
                  return (
                    <div
                      key={source.name}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                        isOk ? "bg-black/5 text-black/60" : "bg-red-50 text-red-600"
                      }`}
                    >
                      {isOk ? (
                        <Check className="w-3 h-3 text-green-600" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}
                      <span>{displayName}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/builds" className="flex items-center justify-between">
            Build History
            <History className="h-3.5 w-3.5 opacity-60" />
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href="https://github.com/eriknson/living-site"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between"
          >
            View Source Code
            <ExternalLink className="h-3.5 w-3.5 opacity-60" />
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
