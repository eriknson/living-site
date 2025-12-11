"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, History, Github, Music, Cloud, MessageCircle, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelativeTime, getBuiltAt, type Manifest } from "@/lib/manifest";

const DATA_VERTICALS = [
  { name: "GitHub", description: "Repos, commits, languages", icon: Github },
  { name: "Spotify", description: "Music taste & genres", icon: Music },
  { name: "X", description: "Posts & themes", icon: MessageCircle },
  { name: "Weather", description: "Location & conditions", icon: Cloud },
  { name: "About", description: "Bio & philosophy", icon: User },
];

interface BuildTimeProps {
  manifest: Manifest | null;
  currentDate?: string | null;
}

export function BuildTime({ manifest, currentDate }: BuildTimeProps) {
  const [relativeTime, setRelativeTime] = useState<string>("");

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

  if (!relativeTime) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-full px-2.5 text-black/60 hover:bg-black/5 active:bg-black/10 outline-none flex items-center cursor-pointer">
          Built {relativeTime}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="px-2 py-2 text-sm text-black/70 leading-relaxed">
          <p>
            This site rebuilds itself daily. Three Cursor CLI agents run on GitHub Actions each morning to generate a fresh version of the website.
          </p>
        </div>

        <DropdownMenuSeparator />

        <div className="px-2 py-1.5 text-sm">
          <div className="text-black/50 text-xs uppercase tracking-wide mb-2">Data Layer</div>
          <div className="space-y-1.5">
            {DATA_VERTICALS.map((vertical) => {
              const Icon = vertical.icon;
              return (
                <div key={vertical.name} className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-black/40" />
                  <span className="text-black/70">{vertical.name}</span>
                  <span className="text-black/40 text-xs ml-auto">{vertical.description}</span>
                </div>
              );
            })}
          </div>
        </div>

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
