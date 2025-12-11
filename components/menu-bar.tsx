"use client";

import { useEffect, useState } from "react";
import { AboutDropdown } from "./about-dropdown";
import { ModelSelector } from "./model-selector";
import { Clock } from "./clock";
import type { Manifest } from "@/lib/manifest";

export function MenuBar() {
  const [manifest, setManifest] = useState<Manifest | null>(null);

  useEffect(() => {
    fetch("/builds/manifest.json")
      .then((res) => res.json())
      .then(setManifest)
      .catch(console.error);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 h-[var(--menu-bar-height)] z-50 flex items-center justify-between px-3 bg-[rgba(246,246,246,0.72)] backdrop-blur-xl border-b border-black/10 text-[13px] text-black/85 select-none">
      <div className="flex items-center gap-1">
        {/* Site name */}
        <div className="flex items-center gap-1.5 font-semibold px-2 py-0.5">
          <span className="w-2 h-2 rounded-full bg-gradient-to-br from-green-500 to-green-600" />
          <span>eriks.design</span>
        </div>

        {/* About dropdown - hidden on mobile */}
        <div className="hidden sm:block">
          <AboutDropdown manifest={manifest} />
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Model selector */}
        <ModelSelector manifest={manifest} />

        {/* Clock - hidden on mobile */}
        <div className="hidden sm:block">
          <Clock />
        </div>
      </div>
    </nav>
  );
}
