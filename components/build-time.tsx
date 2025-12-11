"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, History, Github, Music, Cloud, MessageCircle, User, type LucideIcon } from "lucide-react";
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

const SOURCE_ICONS: Record<string, LucideIcon> = {
  GitHub: Github,
  Spotify: Music,
  Typefully: MessageCircle,
  Weather: Cloud,
  About: User,
};

interface BuildTimeProps {
  manifest: Manifest | null;
  currentDate?: string | null;
}

export function BuildTime({ manifest, currentDate }: BuildTimeProps) {
  const [relativeTime, setRelativeTime] = useState<string>("");
  const [dataSources, setDataSources] = useState<DataSource[]>([]);

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
      .then((data: FetchSummary) => setDataSources(data.sources))
      .catch(() => setDataSources([]));
  }, []);

  if (!relativeTime) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-full px-2.5 text-black/60 hover:bg-black/5 active:bg-black/10 outline-none flex items-center cursor-pointer">
          Built {relativeTime}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="px-2 py-2 text-sm text-black/70 leading-relaxed">
          <p>
            This site rebuilds itself daily. Three Cursor CLI agents run on GitHub Actions each morning to generate a fresh version of the website.
          </p>
        </div>

        {dataSources.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-sm">
              <div className="text-black/50 text-xs uppercase tracking-wide mb-2">Data Layer</div>
              <div className="space-y-1.5">
                {dataSources.map((source) => {
                  const Icon = SOURCE_ICONS[source.name] || User;
                  const isError = source.status !== "success";
                  return (
                    <div key={source.name} className="flex items-start gap-2">
                      <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isError ? "text-red-500" : "text-black/40"}`} />
                      <div className="min-w-0 flex-1">
                        <span className={`${isError ? "text-red-600" : "text-black/70"}`}>
                          {source.name === "Typefully" ? "X" : source.name}
                        </span>
                        <span className="text-black/40 text-xs ml-1.5 truncate">
                          {source.summary}
                        </span>
                      </div>
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
