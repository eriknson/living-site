"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Clock, Home, Zap } from "lucide-react";
import { VersionSelector } from "./version-selector";
import { BuildTime } from "./build-time";
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
import type { Manifest } from "@/lib/manifest";
import type { BuildState } from "@/lib/build-types";

type RouteType = "/" | "/agent" | "/new" | "/builds";

function HouseIcon({ className }: { className?: string }) {
  return (
    <svg 
      width="24" 
      height="21" 
      viewBox="0 0 57 50" 
      fill="currentColor" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d="M21.6562 45.5156V31.7344C21.6562 30.6562 22.3828 29.9531 23.4609 29.9531H32.5312C33.6328 29.9531 34.3125 30.6562 34.3125 31.7344V45.5156H21.6562ZM7.3125 44.1328C7.3125 47.3906 9.28125 49.2891 12.5859 49.2891H43.4062C46.7109 49.2891 48.6562 47.3906 48.6562 44.1328V25.5234L29.3906 9.375C28.5 8.625 27.4453 8.64844 26.5781 9.375L7.3125 25.5234V44.1328ZM2.01562 25.0312C2.67188 25.0312 3.21094 24.6797 3.70312 24.2812L27.1641 4.57031C27.4219 4.35938 27.7266 4.24219 27.9844 4.24219C28.2656 4.24219 28.5469 4.35938 28.8047 4.57031L52.2891 24.2812C52.7578 24.6797 53.2969 25.0312 53.9531 25.0312C55.2188 25.0312 55.9688 24.1172 55.9688 23.1562C55.9688 22.6172 55.7578 22.0547 55.2188 21.6328L30.7969 1.125C29.9062 0.375 28.9453 0 27.9844 0C27.0234 0 26.0625 0.375 25.1719 1.125L0.75 21.6328C0.234375 22.0547 0 22.6172 0 23.1562C0 24.1172 0.75 25.0312 2.01562 25.0312ZM43.2422 12.5859L49.125 17.5547V6.98438C49.125 5.95312 48.4688 5.29688 47.4375 5.29688H44.9297C43.9219 5.29688 43.2422 5.95312 43.2422 6.98438V12.5859Z" />
    </svg>
  );
}

// Build status helpers for /builds page
function getNextBuildTime(): Date {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(6, 0, 0, 0);
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
    .map(([model]) => {
      const names: Record<string, string> = {
        "composer-1": "Composer",
        "claude-4.5-opus-high-thinking": "Opus 4.5",
        "gpt-5.1-codex": "GPT-5.1 Codex",
        "gemini-3-pro": "Gemini 3 Pro",
      };
      return names[model] || model;
    });
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
        <p className="text-[15px] text-black/60 dark:text-white/60 leading-relaxed">
          This website regenerates daily via Cursor CLI agents running on GitHub Actions. Redeploys via Vercel automatically.
        </p>
      </div>
      <div className="bg-black/[0.03] dark:bg-white/[0.05] rounded-2xl px-4 py-3">
        <div className="flex justify-between items-baseline py-1">
          <span className="text-[15px] text-black/50 dark:text-white/50">Next build</span>
          <span className="text-[15px] text-black/90 dark:text-white/90">{formatNextBuildTime(nextBuildTime)}</span>
        </div>
        <div className="flex justify-between items-baseline py-1">
          <span className="text-[15px] text-black/50 dark:text-white/50">Countdown</span>
          <span className="text-[15px] text-black/90 dark:text-white/90">{countdown}</span>
        </div>
        <div className="flex justify-between items-baseline py-1">
          <span className="text-[15px] text-black/50 dark:text-white/50">Schedule</span>
          <span className="text-[15px] text-black/90 dark:text-white/90">Daily at 6am UTC</span>
        </div>
      </div>
      <div className="flex gap-2">
        <Link
          href="/"
          onClick={onLinkClick}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[15px] font-medium text-black/70 dark:text-white/70 bg-black/[0.06] dark:bg-white/[0.08] active:bg-black/10 dark:active:bg-white/15 transition-colors"
        >
          <Home className="h-4 w-4" />
          <span>View Latest</span>
        </Link>
        <a
          href="https://github.com/eriknson/living-site"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onLinkClick}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[15px] font-medium text-black/70 dark:text-white/70 bg-black/[0.06] dark:bg-white/[0.08] active:bg-black/10 dark:active:bg-white/15 transition-colors"
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
          <p className="text-[15px] text-blue-900 dark:text-blue-300 font-medium">
            Build in progress
          </p>
        </div>
        <p className="text-[15px] text-blue-700/70 dark:text-blue-400/70 mt-1">
          {phaseLabel}
        </p>
      </div>
      <div className="bg-black/[0.03] dark:bg-white/[0.05] rounded-2xl px-4 py-3">
        <div className="flex justify-between items-baseline py-1">
          <span className="text-[15px] text-black/50 dark:text-white/50">Elapsed</span>
          <span className="text-[15px] text-black/90 dark:text-white/90">{elapsed}</span>
        </div>
        <div className="flex justify-between items-baseline py-1">
          <span className="text-[15px] text-black/50 dark:text-white/50">Phase</span>
          <span className="text-[15px] text-black/90 dark:text-white/90">{phaseLabel}</span>
        </div>
        {activeModels.length > 0 && (
          <div className="flex justify-between items-baseline py-1">
            <span className="text-[15px] text-black/50 dark:text-white/50">Active</span>
            <span className="text-[15px] text-black/90 dark:text-white/90">{activeModels.join(", ")}</span>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <a
          href="https://github.com/eriknson/living-site/actions"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onLinkClick}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[15px] font-medium text-black/70 dark:text-white/70 bg-black/[0.06] dark:bg-white/[0.08] active:bg-black/10 dark:active:bg-white/15 transition-colors"
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
    <button className="px-3 py-1.5 rounded-full bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] active:bg-black/[0.08] dark:active:bg-white/[0.12] outline-none flex items-center gap-1.5 cursor-pointer transition-colors">
      {isBuilding ? (
        <>
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span>Building · {elapsed}</span>
        </>
      ) : (
        <>
          <Clock className="h-[1.15em] w-[1.15em] opacity-20" strokeWidth={2.5} />
          <span className="text-black/40 dark:text-white/40">Next build in {countdown}</span>
        </>
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
              <div className="flex items-center gap-2 text-[13px]">
                <Zap className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-blue-600 dark:text-blue-400 font-medium">Build in progress</span>
              </div>
              <p className="text-[13px] text-black/50 dark:text-white/50 mt-1">
                {getPhaseLabel(buildState)}
              </p>
            </div>
            <DropdownMenuSeparator />
            <div className="px-3 py-2.5 space-y-1">
              <div className="flex justify-between items-baseline text-[13px]">
                <span className="text-black/50 dark:text-white/50">Elapsed</span>
                <span className="text-black/90 dark:text-white/90">{elapsed}</span>
              </div>
              <div className="flex justify-between items-baseline text-[13px]">
                <span className="text-black/50 dark:text-white/50">Phase</span>
                <span className="text-black/90 dark:text-white/90">{getPhaseLabel(buildState)}</span>
              </div>
              {getActiveModels(buildState).length > 0 && (
                <div className="flex justify-between items-baseline text-[13px]">
                  <span className="text-black/50 dark:text-white/50">Active</span>
                  <span className="text-black/90 dark:text-white/90">{getActiveModels(buildState).join(", ")}</span>
                </div>
              )}
            </div>
            <DropdownMenuSeparator />
            <div className="px-1 py-1">
              <a
                href="https://github.com/eriknson/living-site/actions"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-2 py-2 rounded-sm text-[13px] text-black/80 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/15 transition-colors"
              >
                <span>View on GitHub Actions</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
              </a>
            </div>
          </>
        ) : (
          <>
            <div className="px-3 py-2.5 text-[13px] text-black/60 dark:text-white/60 leading-relaxed">
              This website regenerates daily via Cursor CLI agents running on GitHub Actions. Redeploys via Vercel automatically.
            </div>
            <DropdownMenuSeparator />
            <div className="px-3 py-2.5 space-y-1">
              <div className="flex justify-between items-baseline text-[13px]">
                <span className="text-black/50 dark:text-white/50">Next build</span>
                <span className="text-black/90 dark:text-white/90">{formatNextBuildTime(nextBuildTime)}</span>
              </div>
              <div className="flex justify-between items-baseline text-[13px]">
                <span className="text-black/50 dark:text-white/50">Countdown</span>
                <span className="text-black/90 dark:text-white/90">{countdown}</span>
              </div>
              <div className="flex justify-between items-baseline text-[13px]">
                <span className="text-black/50 dark:text-white/50">Schedule</span>
                <span className="text-black/90 dark:text-white/90 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Daily at 6am UTC
                </span>
              </div>
            </div>
            <DropdownMenuSeparator />
            <div className="px-1 py-1">
              <Link
                href="/"
                className="flex items-center justify-between px-2 py-2 rounded-sm text-[13px] text-black/80 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/15 transition-colors"
              >
                <span>View Latest</span>
                <Home className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
              </Link>
              <a
                href="https://github.com/eriknson/living-site"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-2 py-2 rounded-sm text-[13px] text-black/80 dark:text-white/80 hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/15 transition-colors"
              >
                <span>Source Code</span>
                <ArrowUpRight className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
              </a>
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

  return (
    <nav className="shrink-0 py-4 pt-[calc(1rem+env(safe-area-inset-top))] z-50 text-[length:var(--menu-bar-font-size)] text-anysphere-text select-none">
      <div className="max-w-[640px] mx-auto w-full h-full flex items-center justify-between px-6">
        <div className="flex items-center h-full">
          {/* House icon - always visible, links to home */}
          <Link 
            href="/" 
            className="h-full flex items-center text-black/[0.12] dark:text-white/[0.12] hover:text-black/85 dark:hover:text-white/85 transition-colors"
            aria-label="Home"
          >
            <HouseIcon />
          </Link>
        </div>

        <div className="flex items-center h-full">
          {/* For /builds page: show build status countdown */}
          {isBuilds && <BuildStatus />}

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

          {/* Built in Xs - shown on /new when complete */}
          {isNew && buildComplete && buildTotalTime > 0 && (
            <span className="h-full px-2 text-anysphere-muted flex items-center">
              Built in {buildTotalTime}s
            </span>
          )}

          {/* Version selector - hidden on /new and /builds pages */}
          {!isNew && !isBuilds && (
            <VersionSelector
              manifest={manifest}
              currentRoute={currentRoute}
              currentModel={currentModel}
              currentDate={currentDate}
              currentTimestamp={currentTimestamp}
              onModelChange={onModelChange}
            />
          )}
        </div>
      </div>
    </nav>
  );
}
