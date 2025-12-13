"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Clock, Home, Zap } from "lucide-react";
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
import type { BuildState } from "@/lib/build-types";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

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
      {/* Description */}
      <div className="bg-black/[0.03] rounded-2xl px-4 py-3.5">
        <p className="text-[15px] text-black/60 leading-relaxed">
          This website regenerates daily via Cursor CLI agents running on GitHub Actions. Redeploys via Vercel automatically.
        </p>
      </div>

      {/* Schedule info */}
      <div className="bg-black/[0.03] rounded-2xl px-4 py-3">
        <div className="flex justify-between items-baseline py-1">
          <span className="text-[15px] text-black/50">Next build</span>
          <span className="text-[15px] text-black/90">{formatNextBuildTime(nextBuildTime)}</span>
        </div>
        <div className="flex justify-between items-baseline py-1">
          <span className="text-[15px] text-black/50">Countdown</span>
          <span className="text-[15px] text-black/90">{countdown}</span>
        </div>
        <div className="flex justify-between items-baseline py-1">
          <span className="text-[15px] text-black/50">Schedule</span>
          <span className="text-[15px] text-black/90">Daily at 6am UTC</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          href="/"
          onClick={onLinkClick}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[15px] font-medium text-black/70 bg-black/[0.06] active:bg-black/10 transition-colors"
        >
          <Home className="h-4 w-4" />
          <span>View Latest</span>
        </Link>
        <a
          href="https://github.com/eriknson/living-site"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onLinkClick}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[15px] font-medium text-black/70 bg-black/[0.06] active:bg-black/10 transition-colors"
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
      {/* Status */}
      <div className="bg-blue-500/10 rounded-2xl px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <p className="text-[15px] text-blue-900 font-medium">
            Build in progress
          </p>
        </div>
        <p className="text-[15px] text-blue-700/70 mt-1">
          {phaseLabel}
        </p>
      </div>

      {/* Progress info */}
      <div className="bg-black/[0.03] rounded-2xl px-4 py-3">
        <div className="flex justify-between items-baseline py-1">
          <span className="text-[15px] text-black/50">Elapsed</span>
          <span className="text-[15px] text-black/90">{elapsed}</span>
        </div>
        <div className="flex justify-between items-baseline py-1">
          <span className="text-[15px] text-black/50">Phase</span>
          <span className="text-[15px] text-black/90">{phaseLabel}</span>
        </div>
        {activeModels.length > 0 && (
          <div className="flex justify-between items-baseline py-1">
            <span className="text-[15px] text-black/50">Active</span>
            <span className="text-[15px] text-black/90">{activeModels.join(", ")}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <a
          href="https://github.com/eriknson/living-site/actions"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onLinkClick}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[15px] font-medium text-black/70 bg-black/[0.06] active:bg-black/10 transition-colors"
        >
          <ArrowUpRight className="h-4 w-4" />
          <span>View on GitHub</span>
        </a>
      </div>
    </div>
  );
}

export function BuildsMenuBar() {
  const [buildState, setBuildState] = useState<BuildState | null>(null);
  const [countdown, setCountdown] = useState("");
  const [elapsed, setElapsed] = useState("");
  const [nextBuildTime, setNextBuildTime] = useState<Date>(getNextBuildTime());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isMobile = useIsMobile();

  // Poll for build status (using public endpoint)
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
    const interval = setInterval(checkStatus, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  // Update countdown/elapsed every second
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
    <button className="h-full px-2.5 text-black/60 hover:bg-black/5 active:bg-black/10 outline-none flex items-center gap-2 cursor-pointer">
      {isBuilding ? (
        <>
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span>Building · {elapsed}</span>
        </>
      ) : (
        <>
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>Next build in {countdown}</span>
        </>
      )}
    </button>
  );

  // Render the status dropdown/drawer
  const renderStatusMenu = () => {
    // Mobile: Bottom sheet drawer
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

    // Desktop: Traditional dropdown
    return (
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          {TriggerButton}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[280px]">
          {isBuilding && buildState ? (
            <>
              {/* Building status */}
              <div className="px-3 py-2.5">
                <div className="flex items-center gap-2 text-[13px]">
                  <Zap className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-blue-600 font-medium">Build in progress</span>
                </div>
                <p className="text-[13px] text-black/50 mt-1">
                  {getPhaseLabel(buildState)}
                </p>
              </div>

              <DropdownMenuSeparator />

              {/* Progress details */}
              <div className="px-3 py-2.5 space-y-1">
                <div className="flex justify-between items-baseline text-[13px]">
                  <span className="text-black/50">Elapsed</span>
                  <span className="text-black/90">{elapsed}</span>
                </div>
                <div className="flex justify-between items-baseline text-[13px]">
                  <span className="text-black/50">Phase</span>
                  <span className="text-black/90">{getPhaseLabel(buildState)}</span>
                </div>
                {getActiveModels(buildState).length > 0 && (
                  <div className="flex justify-between items-baseline text-[13px]">
                    <span className="text-black/50">Active</span>
                    <span className="text-black/90">{getActiveModels(buildState).join(", ")}</span>
                  </div>
                )}
              </div>

              <DropdownMenuSeparator />

              {/* Links */}
              <div className="px-1 py-1">
                <a
                  href="https://github.com/eriknson/living-site/actions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-2 py-2 rounded-sm text-[13px] text-black/80 hover:bg-black/5 active:bg-black/10 transition-colors"
                >
                  <span>View on GitHub Actions</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-black/40" />
                </a>
              </div>
            </>
          ) : (
            <>
              {/* Idle description */}
              <div className="px-3 py-2.5 text-[13px] text-black/60 leading-relaxed">
                This website regenerates daily via Cursor CLI agents running on GitHub Actions. Redeploys via Vercel automatically.
              </div>

              <DropdownMenuSeparator />

              {/* Schedule info */}
              <div className="px-3 py-2.5 space-y-1">
                <div className="flex justify-between items-baseline text-[13px]">
                  <span className="text-black/50">Next build</span>
                  <span className="text-black/90">{formatNextBuildTime(nextBuildTime)}</span>
                </div>
                <div className="flex justify-between items-baseline text-[13px]">
                  <span className="text-black/50">Countdown</span>
                  <span className="text-black/90">{countdown}</span>
                </div>
                <div className="flex justify-between items-baseline text-[13px]">
                  <span className="text-black/50">Schedule</span>
                  <span className="text-black/90 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Daily at 6am UTC
                  </span>
                </div>
              </div>

              <DropdownMenuSeparator />

              {/* Links */}
              <div className="px-1 py-1">
                <Link
                  href="/"
                  className="flex items-center justify-between px-2 py-2 rounded-sm text-[13px] text-black/80 hover:bg-black/5 active:bg-black/10 transition-colors"
                >
                  <span>View Latest</span>
                  <Home className="h-3.5 w-3.5 text-black/40" />
                </Link>
                <a
                  href="https://github.com/eriknson/living-site"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-2 py-2 rounded-sm text-[13px] text-black/80 hover:bg-black/5 active:bg-black/10 transition-colors"
                >
                  <span>Source Code</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-black/40" />
                </a>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-[var(--menu-bar-height)] z-50 flex items-center justify-between px-3 bg-black/[0.03] backdrop-blur-2xl backdrop-saturate-[1.8] border-b border-black/[0.04] text-[13px] text-black/80 select-none">
      {/* Left: Site name → links to live site */}
      <div className="flex items-center h-full">
        {/* Black circle on very small screens */}
        <Link href="/" className="h-full px-2.5 flex items-center min-[375px]:hidden hover:bg-black/5 active:bg-black/10">
          <span className="w-3 h-3 bg-black rounded-full" />
        </Link>
        {/* Full text on larger screens */}
        <Link href="/" className="h-full px-2.5 font-semibold hidden min-[375px]:flex items-center hover:bg-black/5 active:bg-black/10">
          eriks.design
        </Link>
      </div>

      {/* Right: Build status + GitHub */}
      <div className="flex items-center h-full">
        {/* Build status with dropdown/drawer */}
        {renderStatusMenu()}

        {/* GitHub link */}
        <a
          href="https://github.com/eriknson/living-site/actions"
          target="_blank"
          rel="noopener noreferrer"
          className="h-full px-2.5 flex items-center hover:bg-black/5 active:bg-black/10"
          title="View GitHub Actions"
        >
          <GitHubIcon className="w-4 h-4" />
        </a>
      </div>
    </nav>
  );
}
