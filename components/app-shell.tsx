"use client";

import { Suspense, type ReactNode, useEffect, useMemo } from "react";
import { ManifestProvider, useManifest } from "@/lib/manifest-context";
import { MenuBar } from "./menu-bar";
import { getModelDisplayName, getBatch, type Manifest } from "@/lib/manifest";

function getBatchInfo(
  manifest: Manifest | null,
  currentDate: string | null,
  currentTimestamp: string | null
): { batchTimestamp: string | null; buildPaths: { model: string; path: string }[] } {
  if (!manifest || !currentDate) return { batchTimestamp: null, buildPaths: [] };

  const batch = getBatch(manifest, currentDate, currentTimestamp ?? undefined);
  if (!batch) return { batchTimestamp: null, buildPaths: [] };

  const buildPaths = batch.builds
    .filter((b) => b.status === "success")
    .map((b) => ({ model: b.model, path: b.path }));

  return { batchTimestamp: batch.timestamp, buildPaths };
}

function AppContent() {
  const { manifest, currentModel, currentDate, currentTimestamp, isLoading, setModel } = useManifest();

  const { buildPaths } = useMemo(
    () => getBatchInfo(manifest, currentDate, currentTimestamp),
    [manifest, currentDate, currentTimestamp]
  );

  const hasBuilds = buildPaths.length > 0;

  // Prefetch all HTML files for instant switching
  useEffect(() => {
    if (!buildPaths.length) return;
    
    const links: HTMLLinkElement[] = [];
    buildPaths.forEach(({ path }) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = `/${path}`;
      link.as = 'document';
      document.head.appendChild(link);
      links.push(link);
    });
    
    return () => {
      links.forEach(link => link.remove());
    };
  }, [buildPaths]);

  // Get the active path for current model
  const activePath = useMemo(() => {
    if (!hasBuilds) return null;
    if (currentModel) {
      const found = buildPaths.find((p) => p.model === currentModel);
      if (found) return found.path;
    }
    return buildPaths[0]?.path ?? null;
  }, [buildPaths, currentModel, hasBuilds]);

  const activeModel = useMemo(() => {
    if (!hasBuilds) return null;
    if (currentModel) {
      const found = buildPaths.find((p) => p.model === currentModel);
      if (found) return found.model;
    }
    return buildPaths[0]?.model ?? null;
  }, [buildPaths, currentModel, hasBuilds]);

  return (
    <div className="h-dvh flex flex-col">
      {/* Menu bar - fixed height, always on top */}
      <MenuBar
        manifest={manifest}
        currentModel={currentModel}
        currentDate={currentDate}
        currentTimestamp={currentTimestamp}
        onModelChange={setModel}
      />
      
      {/* Content area - fills remaining space */}
      <div className="flex-1 relative min-h-0 bg-[#0a0a0a]">
        {activePath ? (
          <iframe
            key={activePath}
            src={`/${activePath}`}
            title={`Site built by ${getModelDisplayName(activeModel ?? '')}`}
            className="absolute inset-0 w-full h-full border-0"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white/60">
            <p>{isLoading ? "Loading..." : "No build available"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children?: ReactNode }) {
  return (
    <Suspense fallback={
      <div className="h-[var(--menu-bar-height)] flex items-center justify-between px-3 bg-black/[0.03] backdrop-blur-2xl backdrop-saturate-[1.8] border-b border-black/[0.04] text-[13px] text-black/80 select-none">
        <div className="flex items-center h-full">
          <span className="font-medium">eriks.design</span>
        </div>
      </div>
    }>
      <ManifestProvider>
        <AppContent />
      </ManifestProvider>
    </Suspense>
  );
}
