"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import { Check, ChevronDown, Infinity, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  getSameBatchModels,
  getModelDisplayName,
} from "@/lib/manifest";
import { useIsMobile } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";

type RouteType = "/" | "/agent" | "/new";

interface VersionSelectorProps {
  manifest?: Manifest | null;
  currentRoute: RouteType;
  currentModel?: string | null;
  currentDate?: string | null;
  currentTimestamp?: string | null;
  onModelChange?: (model: string) => void;
}

export function VersionSelector({
  manifest: providedManifest,
  currentRoute,
  currentModel,
  currentDate,
  currentTimestamp,
  onModelChange,
}: VersionSelectorProps) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [fetchedManifest, setFetchedManifest] = useState<Manifest | null>(null);
  const isMobile = useIsMobile();

  // Use provided manifest or fetch it
  const manifest = providedManifest ?? fetchedManifest;

  // Fetch manifest if not provided (for home page)
  useEffect(() => {
    if (providedManifest) return;

    fetch("/builds/manifest.json")
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data: Manifest) => {
        setFetchedManifest(data);
      })
      .catch(() => {
        // Silently fail - models just won't show
      });
  }, [providedManifest]);

  // Close dropdown when clicking into Shadow DOM content (window loses focus)
  useEffect(() => {
    const handleBlur = () => setDropdownOpen(false);
    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, []);

  const displayDate = currentDate || manifest?.latest_date;
  const displayTimestamp = currentTimestamp || manifest?.latest_timestamp;
  const sameBatchModels = manifest
    ? getSameBatchModels(manifest, displayDate || undefined, displayTimestamp || undefined)
    : [];

  const isHome = currentRoute === "/";
  const isAgent = currentRoute === "/agent";
  const isNew = currentRoute === "/new";

  // Determine what to show as the current selection
  const getDisplayName = () => {
    if (isHome) return "Me";
    if (isNew) return "New";
    if (isAgent && currentModel) return getModelDisplayName(currentModel);
    return "Select version";
  };

  const handleSelectErik = () => {
    track("version_switched", { version: "erik", from: currentRoute });
    setDrawerOpen(false);
    setDropdownOpen(false);
    router.push("/");
  };

  const handleSelectModel = useCallback((model: string) => {
    track("version_switched", { version: model, from: currentRoute });
    setDrawerOpen(false);
    setDropdownOpen(false);
    
    if (isAgent && onModelChange) {
      // Already on agent page, just switch model
      onModelChange(model);
    } else {
      // Navigate to agent page with model
      router.push(`/agent?model=${model}`);
    }
  }, [currentRoute, isAgent, onModelChange, router]);

  const handleGenerateNew = () => {
    track("generate_new_clicked", { from: currentRoute });
    setDrawerOpen(false);
    setDropdownOpen(false);
    router.push("/new");
  };

  const isOpen = isMobile ? drawerOpen : dropdownOpen;
  
  const TriggerButton = (
    <button className="px-3 py-1 rounded-full bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] active:bg-black/[0.08] dark:active:bg-white/[0.12] outline-none flex items-center gap-1.5 cursor-pointer transition-colors">
      <Infinity className="h-3.5 w-3.5 opacity-50" strokeWidth={2.5} />
      <span className="text-[12px] font-medium">{getDisplayName()}</span>
      <ChevronDown className={cn("h-2.5 w-2.5 opacity-50 transition-transform", isOpen && "rotate-180")} />
    </button>
  );

  // Shared list content for both mobile and desktop
  const VersionList = ({ onSelect }: { onSelect: (type: "erik" | "model" | "new", model?: string) => void }) => (
    <>
      {/* Erik's version */}
      <button
        onClick={() => onSelect("erik")}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3.5 sm:px-2 sm:py-2.5 rounded-xl sm:rounded-sm text-left transition-colors",
          "active:bg-black/5 dark:active:bg-white/10 sm:hover:bg-black/5 dark:sm:hover:bg-white/10 sm:active:bg-black/10 dark:sm:active:bg-white/15",
          isHome && "bg-black/[0.04] dark:bg-white/[0.08]"
        )}
      >
        <span className="flex items-center gap-3 sm:gap-2">
          {isHome ? (
            <Check className="h-5 w-5 sm:h-4 sm:w-4 text-black/80 dark:text-white/80" />
          ) : (
            <span className="w-5 sm:w-4" />
          )}
          <span className="text-[15px] sm:text-sm text-black/90 dark:text-white/90">Me</span>
        </span>
      </button>

      {/* AI Models */}
      {sameBatchModels.map((build) => {
        const isActive = isAgent && build.model === currentModel;
        return (
          <button
            key={build.model}
            onClick={() => onSelect("model", build.model)}
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
              <span className="text-[15px] sm:text-sm text-black/90 dark:text-white/90">
                {getModelDisplayName(build.model)}
              </span>
            </span>
            {build.duration_ms && (
              <span className="text-black/40 dark:text-white/40 text-[13px] sm:text-xs tabular-nums">
                {formatDuration(build.duration_ms)}
              </span>
            )}
          </button>
        );
      })}

      {/* New action */}
      <div className="h-px bg-black/10 dark:bg-white/10 my-1" />
      <button
        onClick={() => onSelect("new")}
        className={cn(
          "w-full flex items-center px-4 py-3.5 sm:px-2 sm:py-2.5 rounded-xl sm:rounded-sm text-left transition-colors",
          "active:bg-black/5 dark:active:bg-white/10 sm:hover:bg-black/5 dark:sm:hover:bg-white/10 sm:active:bg-black/10 dark:sm:active:bg-white/15",
          isNew && "bg-black/[0.04] dark:bg-white/[0.08]"
        )}
      >
        <span className="flex items-center gap-3 sm:gap-2">
          {isNew ? (
            <Check className="h-5 w-5 sm:h-4 sm:w-4 text-black/80 dark:text-white/80" />
          ) : (
            <Plus className="h-5 w-5 sm:h-4 sm:w-4 text-black/50 dark:text-white/50" />
          )}
          <span className={cn(
            "text-[15px] sm:text-sm",
            isNew ? "text-black/90 dark:text-white/90" : "text-black/70 dark:text-white/70"
          )}>
            New
          </span>
          <span className="text-[9px] font-medium tracking-wide text-black/40 dark:text-white/40 uppercase bg-black/[0.04] dark:bg-white/[0.05] px-1.5 py-px rounded">
            Beta
          </span>
        </span>
      </button>
    </>
  );

  const handleVersionSelect = (type: "erik" | "model" | "new", model?: string) => {
    if (type === "erik") {
      handleSelectErik();
    } else if (type === "model" && model) {
      handleSelectModel(model);
    } else if (type === "new") {
      handleGenerateNew();
    }
  };

  // Mobile: Bottom sheet drawer
  if (isMobile) {
    return (
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerTrigger asChild>
          {TriggerButton}
        </DrawerTrigger>
        <DrawerContent aria-label="Select version">
          <DrawerHeader className="text-left px-5 pt-1 pb-3">
            <span className="text-[15px] font-medium text-black/90 dark:text-white/90">
              Select Version
            </span>
          </DrawerHeader>
          <div className="px-3 pb-8">
            <div className="bg-black/[0.03] dark:bg-white/[0.05] rounded-2xl p-1">
              <VersionList onSelect={handleVersionSelect} />
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
        {/* Erik's version */}
        <DropdownMenuItem onClick={handleSelectErik} className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {isHome ? <Check className="h-4 w-4" /> : <span className="w-4" />}
            Me
          </span>
        </DropdownMenuItem>

        {/* AI Models */}
        {sameBatchModels.map((build) => {
          const isActive = isAgent && build.model === currentModel;
          return (
            <DropdownMenuItem
              key={build.model}
              onClick={() => handleSelectModel(build.model)}
              className="flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                {isActive ? <Check className="h-4 w-4" /> : <span className="w-4" />}
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

        {/* New action */}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleGenerateNew} className="flex items-center gap-2">
          {isNew ? (
            <Check className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4 text-black/50 dark:text-white/50" />
          )}
          <span className={isNew ? "" : "text-black/70 dark:text-white/70"}>New</span>
          <span className="text-[9px] font-medium tracking-wide text-black/40 dark:text-white/40 uppercase bg-black/[0.04] dark:bg-white/[0.05] px-1.5 py-px rounded">
            Beta
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
