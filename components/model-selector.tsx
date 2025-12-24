"use client";

import { track } from "@vercel/analytics";
import { ChevronDown } from "lucide-react";
import { InfinityIcon } from "@/components/icons/infinity-icon";
import type { Manifest } from "@/lib/manifest";
import {
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
  const displayDate = currentDate || manifest?.latest_date;
  const displayTimestamp = currentTimestamp || manifest?.latest_timestamp;
  const sameBatchModels = manifest ? getSameBatchModels(manifest, displayDate || undefined, displayTimestamp || undefined) : [];

  if (!manifest || !currentModel) {
    return (
      <div className="h-full px-2.5 text-black/40 dark:text-white/40 flex items-center gap-2">
        <InfinityIcon className="h-[1.15em] w-[1.15em] opacity-40" />
        Loading...
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const model = e.target.value;
    track("model_switched", { model, previous_model: currentModel });
    onModelChange(model);
  };

  return (
    <label className="relative h-full flex items-center cursor-pointer hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/15">
      {/* Visual display (non-interactive) */}
      <span className="h-full px-2.5 flex items-center gap-2 pointer-events-none">
        <InfinityIcon className="h-[1.15em] w-[1.15em] opacity-50" />
        <span>{getModelDisplayName(currentModel)}</span>
        <ChevronDown className="h-[0.9em] w-[0.9em] opacity-60" />
      </span>
      
      {/* Native select overlay */}
      <select
        value={currentModel}
        onChange={handleChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        aria-label="Select model"
      >
        {sameBatchModels.map((build) => (
          <option key={build.model} value={build.model}>
            {getModelDisplayName(build.model)}
          </option>
        ))}
      </select>
    </label>
  );
}
