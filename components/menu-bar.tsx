"use client";

import Link from "next/link";
import { ModelSelector } from "./model-selector";
import { BuildTime } from "./build-time";
import type { Manifest } from "@/lib/manifest";

interface MenuBarProps {
  manifest: Manifest | null;
  currentModel: string | null;
  currentDate?: string | null;
  currentTimestamp?: string | null;
  onModelChange: (model: string) => void;
}

export function MenuBar({ manifest, currentModel, currentDate, currentTimestamp, onModelChange }: MenuBarProps) {
  return (
    <nav className="shrink-0 h-[calc(var(--menu-bar-height)+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] z-50 flex items-center justify-between px-3 bg-black/[0.03] dark:bg-white/[0.05] backdrop-blur-2xl backdrop-saturate-[1.8] border-b border-black/[0.04] dark:border-white/[0.08] text-[13px] text-black/80 dark:text-white/80 select-none">
      <div className="flex items-center h-full">
        {/* Black circle on very small screens */}
        <Link href="/" className="h-full px-2.5 flex items-center min-[375px]:hidden hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/15">
          <span className="w-3 h-3 bg-black dark:bg-white rounded-full" />
        </Link>
        {/* Full text on larger screens */}
        <Link href="/" className="h-full px-2.5 font-semibold hidden min-[375px]:flex items-center hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/15">
          eriks.design
        </Link>
      </div>

      <div className="flex items-center h-full">
        {/* Build time with about dropdown */}
        <BuildTime currentRoute="/agent" manifest={manifest} currentModel={currentModel} currentDate={currentDate} currentTimestamp={currentTimestamp} />

        {/* Model selector */}
        <ModelSelector
          manifest={manifest}
          currentModel={currentModel}
          currentDate={currentDate}
          currentTimestamp={currentTimestamp}
          onModelChange={onModelChange}
        />
      </div>
    </nav>
  );
}

