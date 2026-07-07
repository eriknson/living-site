"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Clock, Home, Zap } from "lucide-react";
import { VersionSelector } from "./version-selector";
import { BuildTime } from "./build-time";
import { SearchIcon } from "@/components/icons/search-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/lib/use-media-query";
import { getModelDisplayName, type Manifest } from "@/lib/manifest";
import type { BuildState } from "@/lib/build-types";

// Lazy load the command menu dialog - chunk loads after initial paint
const CommandMenuDialog = dynamic(() => import("./command-menu"), {
  ssr: false,
});

type RouteType = "/" | "/agent" | "/new" | "/builds" | "/posts" | "/play";

// Build status helpers for /builds page
function getNextBuildTime(): Date {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(13, 0, 0, 0);
  if (now >= next) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

function formatElapsed(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime();
  const secs = Math.floor(ms / 1000) % 60;
  const mins = Math.floor(ms / 60000);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function formatCountdown(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatNextBuildTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
}

function getPhaseLabel(state: BuildState): string {
  if (state.workflow.aggregate === "running") return "Gathering data";
  if (state.workflow.generate === "running") return "Generating sites";
  if (state.workflow.commit === "running") return "Saving builds";
  return "Running";
}

function getActiveModels(state: BuildState): string[] {
  return Object.entries(state.models)
    .filter(([, progress]) => progress.status === "running")
    .map(([model]) => getModelDisplayName(model));
}

// Mobile drawer content for IDLE state
function IdleMobileDrawerContent({ countdown, nextBuildTime, onLinkClick }: {
  countdown: string;
  nextBuildTime: Date;
  onLinkClick?: () => void;
}) {
  return (
    <div className="px-3 pb-8 space-y-3">
      <div className="bg-black/[0.03] dark:bg-white/[0.05] rounded-2xl px-4 py-3.5">
        <p className="text-base text-secondary leading-relaxed">
          This website regenerates daily via Cursor CLI agents running on GitHub Actions. Redeploys via Vercel automatically.
        </p>
      </div>
      <div className="bg-black/[0.03] dark:bg-white/[0.05] rounded-2xl px-4 py-3">
        <div className="flex justify-between items-baseline py-1">
          <span className="text-base text-secondary">Next build</span>
          <span className="text-base text-primary">{formatNextBuildTime(nextBuildTime)}</span>
        </div>
        <div className="flex justify-between items-baseline py-1">
          <span className="text-base text-secondary">Countdown</span>
          <span className="text-base text-primary">{countdown}</span>
        </div>
        <div className="flex justify-between items-baseline py-1">
          <span className="text-base text-secondary">Schedule</span>
          <span className="text-base text-primary">Daily at 6am Pacific</span>
        </div>
      </div>
      <div className="flex gap-2">
        <Link
          href="/"
          onClick={onLinkClick}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-base font-medium text-secondary bg-black/[0.06] dark:bg-white/[0.08] active:bg-black/10 dark:active:bg-white/15 transition-colors"
        >
          <Home className="h-4 w-4" />
          <span>View Latest</span>
        </Link>
        <a
          href="https://github.com/eriknson/living-site"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onLinkClick}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-base font-medium text-secondary bg-black/[0.06] dark:bg-white/[0.08] active:bg-black/10 dark:active:bg-white/15 transition-colors"
        >
          <ArrowUpRight className="h-4 w-4" />
          <span>Source</span>
        </a>
      </div>
    </div>
  );
}

// Mobile drawer content for BUILDING state
function BuildingMobileDrawerContent({ state, elapsed, onLinkClick }: {
  state: BuildState;
  elapsed: string;
  onLinkClick?: () => void;
}) {
  const activeModels = getActiveModels(state);
  const phaseLabel = getPhaseLabel(state);

  return (
    <div className="px-3 pb-8 space-y-3">
      <div className="bg-blue-500/10 dark:bg-blue-500/20 rounded-2xl px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <p className="text-base text-blue-900 dark:text-blue-300 font-medium">
            Build in progress
          </p>
        </div>
        <p className="text-base text-blue-700/70 dark:text-blue-400/70 mt-1">
          {phaseLabel}
        </p>
      </div>
      <div className="bg-black/[0.03] dark:bg-white/[0.05] rounded-2xl px-4 py-3">
        <div className="flex justify-between items-baseline py-1">
          <span className="text-base text-secondary">Elapsed</span>
          <span className="text-base text-primary">{elapsed}</span>
        </div>
        <div className="flex justify-between items-baseline py-1">
          <span className="text-base text-secondary">Phase</span>
          <span className="text-base text-primary">{phaseLabel}</span>
        </div>
        {activeModels.length > 0 && (
          <div className="flex justify-between items-baseline py-1">
            <span className="text-base text-secondary">Active</span>
            <span className="text-base text-primary">{activeModels.join(", ")}</span>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <a
          href="https://github.com/eriknson/living-site/actions"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onLinkClick}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-base font-medium text-secondary bg-black/[0.06] dark:bg-white/[0.08] active:bg-black/10 dark:active:bg-white/15 transition-colors"
        >
          <ArrowUpRight className="h-4 w-4" />
          <span>View on GitHub</span>
        </a>
      </div>
    </div>
  );
}

// Build status button with dropdown/drawer for /builds page
function BuildStatus() {
  const [buildState, setBuildState] = useState<BuildState | null>(null);
  const [countdown, setCountdown] = useState("");
  const [elapsed, setElapsed] = useState("");
  const [nextBuildTime, setNextBuildTime] = useState<Date>(getNextBuildTime());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch("/api/build-status");
        const { state } = await res.json();
        setBuildState(state?.status === "running" ? state : null);
      } catch {
        setBuildState(null);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const tick = () => {
      if (buildState?.status === "running" && buildState.startedAt) {
        setElapsed(formatElapsed(buildState.startedAt));
      } else {
        const next = getNextBuildTime();
        setNextBuildTime(next);
        setCountdown(formatCountdown(next.getTime() - Date.now()));
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [buildState]);

  const isBuilding = buildState?.status === "running";

  const TriggerButton = (
    <button className="outline-none flex items-center gap-1.5 cursor-pointer text-tertiary hover:text-secondary transition-colors whitespace-nowrap">
      {isBuilding ? (
        <>
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span>Building · {elapsed}</span>
        </>
      ) : (
        <span>Building in {countdown}</span>
      )}
    </button>
  );

  if (isMobile) {
    return (
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerTrigger asChild>
          {TriggerButton}
        </DrawerTrigger>
        <DrawerContent aria-label="Build status">
          {isBuilding && buildState ? (
            <BuildingMobileDrawerContent
              state={buildState}
              elapsed={elapsed}
              onLinkClick={() => setDrawerOpen(false)}
            />
          ) : (
            <IdleMobileDrawerContent
              countdown={countdown}
              nextBuildTime={nextBuildTime}
              onLinkClick={() => setDrawerOpen(false)}
            />
          )}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        {TriggerButton}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px]">
        {isBuilding && buildState ? (
          <>
            <div className="px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-blue-600 dark:text-blue-400 font-medium">Build in progress</span>
              </div>
              <p className="text-sm text-secondary mt-1">
                {getPhaseLabel(buildState)}
              </p>
            </div>
            <DropdownMenuSeparator />
            <div className="px-3 py-2.5 space-y-1">
              <div className="flex justify-between items-baseline text-sm">
                <span className="text-secondary">Elapsed</span>
                <span className="text-primary">{elapsed}</span>
              </div>
              <div className="flex justify-between items-baseline text-sm">
                <span className="text-secondary">Phase</span>
                <span className="text-primary">{getPhaseLabel(buildState)}</span>
              </div>
              {getActiveModels(buildState).length > 0 && (
                <div className="flex justify-between items-baseline text-sm">
                  <span className="text-secondary">Active</span>
                  <span className="text-primary">{getActiveModels(buildState).join(", ")}</span>
                </div>
              )}
            </div>
            <DropdownMenuSeparator />
            <div className="px-1 py-1">
              <a
                href="https://github.com/eriknson/living-site/actions"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-2 py-2 rounded-sm text-sm text-primary hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/15 transition-colors"
              >
                <span>View on GitHub Actions</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-tertiary" />
              </a>
            </div>
          </>
        ) : (
          <>
            <div className="px-3 py-2.5 text-sm text-secondary leading-relaxed">
              This website regenerates daily via Cursor CLI agents running on GitHub Actions. Redeploys via Vercel automatically.
            </div>
            <DropdownMenuSeparator />
            <div className="px-3 py-2.5 space-y-1">
              <div className="flex justify-between items-baseline text-sm">
                <span className="text-secondary">Next build</span>
                <span className="text-primary">{formatNextBuildTime(nextBuildTime)}</span>
              </div>
              <div className="flex justify-between items-baseline text-sm">
                <span className="text-secondary">Countdown</span>
                <span className="text-primary">{countdown}</span>
              </div>
              <div className="flex justify-between items-baseline text-sm">
                <span className="text-secondary">Schedule</span>
                <span className="text-primary flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Daily at 6am Pacific
                </span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <div className="px-1 py-1">
              <Link
                href="/"
                className="flex items-center justify-between px-2 py-2 rounded-sm text-sm text-primary hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/15 transition-colors"
              >
                <span>View Latest</span>
                <Home className="h-3.5 w-3.5 text-tertiary" />
              </Link>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface GlobalMenuBarProps {
  currentRoute: RouteType;
  // Manifest and model info (needed for both / and /agent)
  manifest?: Manifest | null;
  currentModel?: string | null;
  currentDate?: string | null;
  currentTimestamp?: string | null;
  onModelChange?: (model: string) => void;
  // For /new page when build is complete
  buildComplete?: boolean;
  buildTotalTime?: number;
}

export function GlobalMenuBar({
  currentRoute,
  manifest = null,
  currentModel = null,
  currentDate = null,
  currentTimestamp = null,
  onModelChange,
  buildComplete = false,
  buildTotalTime = 0,
}: GlobalMenuBarProps) {
  const isNew = currentRoute === "/new";
  const isBuilds = currentRoute === "/builds";
  const isMobile = useIsMobile();
  
  // Command menu state - controlled from here, dialog is lazy loaded
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandLoaded, setCommandLoaded] = useState(false);

  // Preload command menu chunk shortly after mount (not blocking initial paint)
  useEffect(() => {
    const timer = setTimeout(() => {
      import("./command-menu").then(() => setCommandLoaded(true));
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Global keyboard listener for ⌘K / Ctrl+K - always active
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <nav className="shrink-0 py-4 pt-[calc(1rem+env(safe-area-inset-top))] z-50 text-[length:var(--menu-bar-font-size)] text-primary select-none border-b border-subtle bg-page md:sticky md:top-0">
      <div className="max-w-[640px] mx-auto w-full h-full flex items-center justify-between px-6">
        <div className="flex items-center h-full gap-1">
          {/* Version selector - shown on all pages */}
          <VersionSelector
            manifest={manifest}
            currentRoute={currentRoute}
            currentModel={currentModel}
            currentDate={currentDate}
            currentTimestamp={currentTimestamp}
            onModelChange={onModelChange}
          />

          {/* For /builds page: show build status after version selector */}
          {isBuilds && (
            <span className="px-2">
              <BuildStatus />
            </span>
          )}

          {/* For other pages: show build time info */}
          {!isBuilds && (
            <BuildTime
              currentRoute={currentRoute}
              manifest={manifest}
              currentModel={currentModel}
              currentDate={currentDate}
              currentTimestamp={currentTimestamp}
            />
          )}
        </div>

        <div className="flex items-center h-full gap-2">
          {/* Built in Xs - shown on /new when complete */}
          {isNew && buildComplete && buildTotalTime > 0 && (
            <span className="h-full px-2 text-anysphere-muted flex items-center">
              Built in {buildTotalTime}s
            </span>
          )}
          
          {/* Command menu trigger button - always rendered */}
          <button
            onClick={() => setCommandOpen(true)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-black/[0.03] dark:bg-white/[0.06] active:bg-black/[0.08] dark:active:bg-white/[0.12] transition-colors select-none cursor-pointer"
            style={{
              touchAction: "manipulation",
              WebkitTapHighlightColor: "transparent",
            }}
            aria-label="Open command menu"
          >
            <SearchIcon className="h-[1em] w-[1em] opacity-50" />
            {!isMobile && (
              <span className="text-tertiary text-sm">
                ⌘K
              </span>
            )}
          </button>
          
          {/* Command menu dialog - lazy loaded, renders when open or preloaded */}
          {(commandOpen || commandLoaded) && (
            <CommandMenuDialog open={commandOpen} onOpenChange={setCommandOpen} />
          )}
        </div>
      </div>
    </nav>
  );
}
