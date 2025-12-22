"use client";

import Link from "next/link";
import { VersionSelector } from "./version-selector";
import { BuildTime } from "./build-time";
import type { Manifest } from "@/lib/manifest";

type RouteType = "/" | "/agent" | "/new";

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
          {/* Build time with info dropdown - right next to version selector */}
          <BuildTime
            currentRoute={currentRoute}
            manifest={manifest}
            currentModel={currentModel}
            currentDate={currentDate}
            currentTimestamp={currentTimestamp}
          />

          {/* Built in Xs - shown on /new when complete */}
          {isNew && buildComplete && buildTotalTime > 0 && (
            <span className="h-full px-2 text-anysphere-muted flex items-center">
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
