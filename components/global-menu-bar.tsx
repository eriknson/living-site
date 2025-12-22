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
  const isHome = currentRoute === "/";
  const isNew = currentRoute === "/new";

  return (
    <nav className="shrink-0 py-4 pt-[calc(1rem+env(safe-area-inset-top))] z-50 text-[length:var(--menu-bar-font-size)] text-anysphere-text select-none">
      <div className="max-w-[640px] mx-auto w-full h-full flex items-center justify-between px-6">
        <div className="flex items-center h-full">
          {/* Black circle on very small screens */}
          {isHome ? (
            <span className="h-full flex items-center min-[375px]:hidden">
              <span className="w-3.5 h-3.5 bg-anysphere-text rounded-full" />
            </span>
          ) : (
            <Link href="/" className="h-full flex items-center min-[375px]:hidden hover:opacity-70 transition-opacity">
              <span className="w-3.5 h-3.5 bg-anysphere-text rounded-full" />
            </Link>
          )}
          {/* Full text on larger screens */}
          {isHome ? (
            <span className="h-full font-semibold text-[length:var(--menu-bar-logo-size)] hidden min-[375px]:flex items-center">
              eriks.design
            </span>
          ) : (
            <Link href="/" className="h-full font-semibold text-[length:var(--menu-bar-logo-size)] hidden min-[375px]:flex items-center hover:opacity-70 transition-opacity">
              eriks.design
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2 h-full">
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
            <span className="h-full px-2.5 text-anysphere-muted flex items-center">
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
          />
        </div>
      </div>
    </nav>
  );
}
