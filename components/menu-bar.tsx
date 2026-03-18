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
    <nav className="z-50 flex h-[calc(var(--menu-bar-height)+env(safe-area-inset-top))] shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-hover)] px-3 pt-[env(safe-area-inset-top)] text-[length:var(--menu-bar-font-size)] text-[var(--color-text)] backdrop-blur-2xl backdrop-saturate-[1.8] select-none">
      <div className="flex items-center h-full">
        {/* Black circle on very small screens */}
        <Link href="/" className="h-full px-2.5 flex items-center min-[375px]:hidden hover:bg-[var(--color-hover)] active:bg-[var(--color-active)]">
          <span className="h-3.5 w-3.5 rounded-full bg-[var(--color-text)]" />
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

