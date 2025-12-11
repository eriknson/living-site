"use client";

import { ModelSelector } from "./model-selector";
import { BuildTime } from "./build-time";
import type { Manifest } from "@/lib/manifest";

interface MenuBarProps {
  manifest: Manifest | null;
  currentModel: string | null;
  currentDate?: string | null;
  onModelChange: (model: string) => void;
}

export function MenuBar({ manifest, currentModel, currentDate, onModelChange }: MenuBarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 h-[var(--menu-bar-height)] z-50 flex items-center justify-between px-3 bg-white/40 backdrop-blur-md backdrop-saturate-150 border-b border-black/5 text-[13px] text-black/85 select-none">
      <div className="flex items-center h-full">
        <span className="h-full px-2.5 font-semibold flex items-center">
          eriks.design
        </span>
      </div>

      <div className="flex items-center h-full">
        {/* Build time with about dropdown */}
        <BuildTime manifest={manifest} currentDate={currentDate} />

        {/* Model selector */}
        <ModelSelector
          manifest={manifest}
          currentModel={currentModel}
          currentDate={currentDate}
          onModelChange={onModelChange}
        />
      </div>
    </nav>
  );
}

