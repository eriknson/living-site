"use client";

import { AboutDropdown } from "./about-dropdown";
import { ModelSelector } from "./model-selector";
import { Clock } from "./clock";
import type { Manifest } from "@/lib/manifest";

interface MenuBarProps {
  manifest: Manifest | null;
  currentModel: string | null;
  onModelChange: (model: string) => void;
}

export function MenuBar({ manifest, currentModel, onModelChange }: MenuBarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 h-[var(--menu-bar-height)] z-50 flex items-center justify-between px-3 bg-white/40 backdrop-blur-md backdrop-saturate-150 border-b border-black/5 text-[13px] text-black/85 select-none">
      <div className="flex items-center h-full">
        {/* Site name with About dropdown */}
        <AboutDropdown manifest={manifest} />
      </div>

      <div className="flex items-center h-full">
        {/* Model selector */}
        <ModelSelector
          manifest={manifest}
          currentModel={currentModel}
          onModelChange={onModelChange}
        />

        {/* Clock - hidden on mobile */}
        <div className="hidden sm:flex items-center h-full">
          <Clock />
        </div>
      </div>
    </nav>
  );
}

