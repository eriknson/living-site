"use client";

import { useState, useEffect, useCallback } from "react";
import { track } from "@vercel/analytics";
import { Check, ChevronDown } from "lucide-react";
import { InfinityIcon } from "@/components/icons/infinity-icon";

// #region agent log
function logModelEvent(msg: string, data: Record<string, unknown>, hypId: string) {
  const fullData = {...data,bodyOverflow:document.body.style.overflow,bodyTouchAction:document.body.style.touchAction,bodyPointerEvents:document.body.style.pointerEvents};
  console.log(`[DEBUG ${hypId}] ${msg}:`, JSON.stringify(fullData));
  fetch('http://127.0.0.1:7242/ingest/7b82bf8a-7c03-4697-b719-1e325f7e9340',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'model-selector.tsx',message:msg,data:fullData,timestamp:Date.now(),sessionId:'debug-session',hypothesisId:hypId})}).catch(()=>{});
}
// #endregion
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTrigger,
} from "@/components/ui/drawer";
import type { Manifest } from "@/lib/manifest";
import {
  formatDuration,
  formatRelativeTime,
  getBuiltAt,
  getSameBatchModels,
  getModelDisplayName,
} from "@/lib/manifest";
import { useIsMobile } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  manifest: Manifest | null;
  currentModel: string | null;
  currentDate?: string | null;
  currentTimestamp?: string | null;
  onModelChange: (model: string) => void;
}

export function ModelSelector({ manifest, currentModel, currentDate, currentTimestamp, onModelChange }: ModelSelectorProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isMobile = useIsMobile();

  // Close dropdown when clicking into iframe (window loses focus)
  useEffect(() => {
    const handleBlur = () => setDropdownOpen(false);
    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, []);

  const displayDate = currentDate || manifest?.latest_date;
  const displayTimestamp = currentTimestamp || manifest?.latest_timestamp;
  const sameBatchModels = manifest ? getSameBatchModels(manifest, displayDate || undefined, displayTimestamp || undefined) : [];
  
  // Get built time for the header
  const builtAt = manifest ? getBuiltAt(manifest, displayDate || undefined, displayTimestamp || undefined) : undefined;
  const relativeTime = builtAt ? formatRelativeTime(builtAt) : undefined;

  if (!manifest || !currentModel) {
    return (
      <div className="h-full px-2.5 text-black/40 dark:text-white/40 flex items-center gap-1.5">
        <InfinityIcon className="h-4 w-4 opacity-40" />
        Loading...
      </div>
    );
  }

  const handleSelect = useCallback((model: string) => {
    // #region agent log
    logModelEvent('model_select_start', { model, previousModel: currentModel, isMobile, drawerOpen }, 'D,E');
    // #endregion
    track("model_switched", { model, previous_model: currentModel });
    onModelChange(model);
    setDrawerOpen(false);
    // #region agent log
    setTimeout(() => logModelEvent('model_select_after_drawer_close', { model }, 'D,E'), 100);
    // #endregion
  }, [currentModel, isMobile, drawerOpen, onModelChange]);

  const isOpen = isMobile ? drawerOpen : dropdownOpen;
  const TriggerButton = (
    <button className="h-full px-2.5 hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/15 outline-none flex items-center gap-1.5 cursor-pointer">
      <InfinityIcon className="h-4 w-4 opacity-50" />
      <span>{getModelDisplayName(currentModel)}</span>
      <ChevronDown className={cn("h-3 w-3 opacity-60 transition-transform", isOpen && "rotate-180")} />
    </button>
  );

  const ModelList = ({ onSelect }: { onSelect: (model: string) => void }) => (
    <>
      {sameBatchModels.map((build) => {
        const isActive = build.model === currentModel;
        return (
          <button
            key={build.model}
            onClick={() => onSelect(build.model)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3.5 sm:px-2 sm:py-2.5 rounded-xl sm:rounded-sm text-left transition-colors",
              "active:bg-black/5 dark:active:bg-white/10 sm:hover:bg-black/5 dark:sm:hover:bg-white/10 sm:active:bg-black/10 dark:sm:active:bg-white/15",
              isActive && "bg-black/[0.04] dark:bg-white/[0.08]"
            )}
          >
            <span className="flex items-center gap-3 sm:gap-2">
              {isActive ? (
                <Check className="h-5 w-5 sm:h-4 sm:w-4 text-black/80 dark:text-white/80" />
              ) : (
                <span className="w-5 sm:w-4" />
              )}
              <span className="text-[15px] sm:text-sm text-black/90 dark:text-white/90">{getModelDisplayName(build.model)}</span>
            </span>
            {build.duration_ms && (
              <span className="text-black/40 dark:text-white/40 text-[13px] sm:text-xs tabular-nums">
                {formatDuration(build.duration_ms)}
              </span>
            )}
          </button>
        );
      })}
    </>
  );

  // Mobile: Bottom sheet drawer
  if (isMobile) {
    return (
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerTrigger asChild>
          {TriggerButton}
        </DrawerTrigger>
        <DrawerContent aria-label="Select build model">
          <DrawerHeader className="text-left px-5 pt-1 pb-3">
            <span className="text-[15px] font-medium text-black/90 dark:text-white/90">
              Select Model
            </span>
          </DrawerHeader>
          <div className="px-3 pb-8">
            <div className="bg-black/[0.03] dark:bg-white/[0.05] rounded-2xl p-1">
              <ModelList onSelect={handleSelect} />
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Traditional dropdown
  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        {TriggerButton}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {sameBatchModels.map((build) => {
          const isActive = build.model === currentModel;
          return (
            <DropdownMenuItem
              key={build.model}
              onClick={() => {
                track("model_switched", { model: build.model, previous_model: currentModel });
                onModelChange(build.model);
              }}
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
                <span className="text-black/40 dark:text-white/40 text-xs">
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
