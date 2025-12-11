"use client";

import { Check, ChevronDown, Infinity } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Manifest } from "@/lib/manifest";
import {
  formatDuration,
  getAvailableModels,
  getModelDisplayName,
} from "@/lib/manifest";

interface ModelSelectorProps {
  manifest: Manifest | null;
  currentModel: string | null;
  currentDate?: string | null;
  onModelChange: (model: string) => void;
}

export function ModelSelector({ manifest, currentModel, currentDate, onModelChange }: ModelSelectorProps) {
  // Use the current date or fall back to latest
  const displayDate = currentDate || manifest?.latest_date;
  const availableModels = manifest ? getAvailableModels(manifest, displayDate || undefined) : [];

  if (!manifest || !currentModel) {
    return (
      <div className="h-full px-2.5 text-black/40 flex items-center gap-1.5">
        <Infinity className="h-4 w-4 opacity-40" strokeWidth={2.5} />
        Loading...
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-full px-2.5 hover:bg-black/5 active:bg-black/10 outline-none flex items-center gap-1.5">
          <Infinity className="h-4 w-4 opacity-50" strokeWidth={2.5} />
          <span>{getModelDisplayName(currentModel)}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal text-black/60">
          Built {displayDate}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {availableModels.map((build) => {
          const isActive = build.model === currentModel;

          return (
            <DropdownMenuItem
              key={build.model}
              onClick={() => onModelChange(build.model)}
              className="flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                {isActive ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <span className="w-4" />
                )}
                {getModelDisplayName(build.model)}
              </span>
              {build.duration_ms && (
                <span className="text-black/40 text-xs">
                  {formatDuration(build.duration_ms)}
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

