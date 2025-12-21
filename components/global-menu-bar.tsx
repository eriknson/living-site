"use client";

import Link from "next/link";
import { VersionSelector } from "./version-selector";
import { BuildTime } from "./build-time";
import type { Manifest } from "@/lib/manifest";

type RouteType = "/" | "/agent" | "/new";

interface GlobalMenuBarProps {
  currentRoute: RouteType;
  // Manifest and model info (needed for both / and /agent)
  manifest?: Manifest | null;
  currentModel?: string | null;
  currentDate?: string | null;
  currentTimestamp?: string | null;
  onModelChange?: (model: string) => void;
  // For /new page building state
  isBuilding?: boolean;
  buildElapsed?: number;
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
  isBuilding = false,
  buildElapsed = 0,
  buildComplete = false,
  buildTotalTime = 0,
}: GlobalMenuBarProps) {
  const isHome = currentRoute === "/";
  const isNew = currentRoute === "/new";

  return (
    <nav className="shrink-0 h-[calc(var(--menu-bar-height)+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] z-50 flex items-center justify-between px-3 bg-black/[0.03] dark:bg-white/[0.05] backdrop-blur-2xl backdrop-saturate-[1.8] border-b border-black/[0.04] dark:border-white/[0.08] text-[13px] text-black/80 dark:text-white/80 select-none">
      <div className="flex items-center h-full">
        {/* Black circle on very small screens */}
        {isHome ? (
          <span className="h-full px-2.5 flex items-center min-[375px]:hidden">
            <span className="w-3 h-3 bg-black dark:bg-white rounded-full" />
          </span>
        ) : (
          <Link href="/" className="h-full px-2.5 flex items-center min-[375px]:hidden hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/15">
            <span className="w-3 h-3 bg-black dark:bg-white rounded-full" />
          </Link>
        )}
        {/* Full text on larger screens */}
        {isHome ? (
          <span className="h-full px-2.5 font-semibold hidden min-[375px]:flex items-center">
            eriks.design
          </span>
        ) : (
          <Link href="/" className="h-full px-2.5 font-semibold hidden min-[375px]:flex items-center hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/15">
            eriks.design
          </Link>
        )}
      </div>

      <div className="flex items-center h-full">
        {/* Build time with info dropdown */}
        <BuildTime
          currentRoute={currentRoute}
          manifest={manifest}
          currentModel={currentModel}
          currentDate={currentDate}
          currentTimestamp={currentTimestamp}
        />

        {/* Built in Xs - shown on /new when complete */}
        {isNew && buildComplete && buildTotalTime > 0 && (
          <span className="h-full px-2.5 text-black/60 dark:text-white/60 flex items-center">
            Built in {buildTotalTime}s
          </span>
        )}

        {/* Version selector */}
        <VersionSelector
          manifest={manifest}
          currentRoute={currentRoute}
          currentModel={currentModel}
          currentDate={currentDate}
          currentTimestamp={currentTimestamp}
          onModelChange={onModelChange}
          isBuilding={isBuilding}
          buildElapsed={buildElapsed}
        />
      </div>
    </nav>
  );
}
