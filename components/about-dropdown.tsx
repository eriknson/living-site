"use client";

import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Manifest } from "@/lib/manifest";
import { formatDuration, getModelDisplayName, getBuildForModel, getBuiltAt, formatRelativeTime } from "@/lib/manifest";
import { ExternalLink } from "lucide-react";

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
  const madeByValue = displayModel
    ? `${getModelDisplayName(displayModel)}${currentBuild?.duration_ms ? ` in ${formatDuration(currentBuild.duration_ms)}` : ""}`
    : "—";

  // Format "Updated" value
  const updatedValue = builtAt ? formatRelativeTime(builtAt) : "—";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-full px-2.5 font-semibold hover:bg-black/5 active:bg-black/10 outline-none flex items-center">
          eriks.design
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <div className="px-2 py-2 text-sm text-black/70 leading-relaxed">
          <p>
            This site regenerates daily using fresh data and AI. Same data,
            different minds.
          </p>
        </div>

        <DropdownMenuSeparator />

        <div className="px-2 py-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-black/60">Made by</span>
            <span>{madeByValue}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-black/60">Updated</span>
            <span>{updatedValue}</span>
          </div>
        </div>

        <DropdownMenuSeparator />

        <div className="px-2 py-1.5 text-sm">
          {dataSources.map((source) => (
            <div key={source.name} className="flex justify-between">
              <span className="text-black/60">{source.name}</span>
              <span className={source.status === "success" ? "text-green-600" : "text-red-600"}>
                {source.status === "success" ? "Connected" : "Error"}
              </span>
            </div>
          ))}
        </div>

        <DropdownMenuSeparator />

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

