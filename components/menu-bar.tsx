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
    <nav className="shrink-0 h-[calc(var(--menu-bar-height)+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] z-50 flex items-center justify-between px-3 bg-[var(--color-hover)] backdrop-blur-2xl backdrop-saturate-[1.8] border-b border-[var(--color-border)] text-[length:var(--menu-bar-font-size)] text-anysphere-text select-none">
      <div className="flex items-center h-full">
        {/* Black circle on very small screens */}
        <Link href="/" className="h-full px-2.5 flex items-center min-[375px]:hidden hover:bg-[var(--color-hover)] active:bg-[var(--color-active)]">
          <span className="w-3.5 h-3.5 bg-anysphere-text rounded-full" />
        </Link>
        {/* Full text on larger screens */}
        <Link href="/" className="h-full px-2.5 font-semibold text-[length:var(--menu-bar-logo-size)] hidden min-[375px]:flex items-center hover:bg-[var(--color-hover)] active:bg-[var(--color-active)]">
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

