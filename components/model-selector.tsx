"use client";

import { Check, ChevronDown, Infinity } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Manifest } from "@/lib/manifest";
import {
  formatDuration,
  getSameBatchModels,
  getModelDisplayName,
} from "@/lib/manifest";

interface ModelSelectorProps {
  manifest: Manifest | null;
  currentModel: string | null;
  currentDate?: string | null;
  currentTimestamp?: string | null;
  onModelChange: (model: string) => void;
}

export function ModelSelector({ manifest, currentModel, currentDate, currentTimestamp, onModelChange }: ModelSelectorProps) {
  // Use the current date or fall back to latest
  const displayDate = currentDate || manifest?.latest_date;
  const displayTimestamp = currentTimestamp || manifest?.latest_timestamp;
  // Only show models from the same batch
  const sameBatchModels = manifest ? getSameBatchModels(manifest, displayDate || undefined, displayTimestamp || undefined) : [];

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
        <button className="h-full px-2.5 hover:bg-black/5 active:bg-black/10 outline-none flex items-center gap-1.5 cursor-pointer">
          <Infinity className="h-4 w-4 opacity-50" strokeWidth={2.5} />
          <span>{getModelDisplayName(currentModel)}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {sameBatchModels.map((build) => {
          const isActive = build.model === currentModel;

          return (
            <DropdownMenuItem
              key={build.model}
              onClick={() => onModelChange(build.model)}
              className="flex items-center justify-between"
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

