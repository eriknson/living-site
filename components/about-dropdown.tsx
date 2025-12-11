"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Manifest } from "@/lib/manifest";
import { formatDuration, getModelDisplayName, getBuildForModel } from "@/lib/manifest";
import { ExternalLink } from "lucide-react";

interface AboutDropdownProps {
  manifest: Manifest | null;
  currentModel?: string | null;
  currentDate?: string | null;
}

export function AboutDropdown({ manifest, currentModel, currentDate }: AboutDropdownProps) {
  // Get the build for the currently displayed model/date
  const displayModel = currentModel || manifest?.default_model;
  const displayDate = currentDate || manifest?.latest_date;
  const currentBuild = manifest && displayModel && displayDate
    ? getBuildForModel(manifest, displayModel, displayDate)
    : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-full px-2.5 font-semibold hover:bg-black/5 active:bg-black/10 outline-none flex items-center">
          eriks.design
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="font-normal text-black/60">
          About This Site
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="px-2 py-2 text-sm text-black/70 leading-relaxed">
          <p>
            This site regenerates daily using fresh data and AI. Same data,
            different minds.
          </p>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="font-normal text-black/60">
          Current Build
        </DropdownMenuLabel>

        {manifest && displayModel && (
          <div className="px-2 py-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-black/60">Model</span>
              <span>{getModelDisplayName(displayModel)}</span>
            </div>
            {currentBuild?.duration_ms && (
              <div className="flex justify-between">
                <span className="text-black/60">Build time</span>
                <span>{formatDuration(currentBuild.duration_ms)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-black/60">Date</span>
              <span>{displayDate}</span>
            </div>
          </div>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="font-normal text-black/60">
          Data Sources
        </DropdownMenuLabel>

        <div className="px-2 py-1.5 text-sm text-black/70">
          <p>GitHub, Spotify, Typefully, Weather</p>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <a
            href="https://github.com/eriknson/living-site"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between"
          >
            View Source
            <ExternalLink className="h-3.5 w-3.5 opacity-60" />
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

