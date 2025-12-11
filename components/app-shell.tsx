"use client";

import { Suspense, type ReactNode } from "react";
import { ManifestProvider, useManifest } from "@/lib/manifest-context";
import { MenuBar } from "./menu-bar";
import { getModelDisplayName } from "@/lib/manifest";

function AppContent() {
  const { manifest, currentModel, currentDate, currentTimestamp, currentBuildPath, isLoading, setModel } = useManifest();

  return (
    <>
      <MenuBar
        manifest={manifest}
        currentModel={currentModel}
        currentDate={currentDate}
        currentTimestamp={currentTimestamp}
        onModelChange={setModel}
      />
      <main className="pt-[var(--menu-bar-height)]">
        {currentBuildPath ? (
          <iframe
            key={currentBuildPath}
            src={`/${currentBuildPath}`}
            title={`Site built by ${currentModel ? getModelDisplayName(currentModel) : "AI"}`}
            className="w-full h-[calc(100vh-var(--menu-bar-height))] border-0"
          />
        ) : (
          <div className="flex items-center justify-center h-[calc(100vh-var(--menu-bar-height))] text-black/60">
            <p>{isLoading ? "Loading..." : "No build available"}</p>
          </div>
        )}
      </main>
    </>
  );
}

export function AppShell({ children }: { children?: ReactNode }) {
  return (
    <Suspense fallback={
      <div className="fixed top-0 left-0 right-0 h-[var(--menu-bar-height)] z-50 flex items-center justify-between px-3 bg-white/40 backdrop-blur-md backdrop-saturate-150 border-b border-black/5 text-[13px] text-black/85 select-none">
        <div className="flex items-center h-full">
          <span className="font-medium">Erik Björnager</span>
        </div>
      </div>
    }>
      <ManifestProvider>
        <AppContent />
      </ManifestProvider>
    </Suspense>
  );
}
