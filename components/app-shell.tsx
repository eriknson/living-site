"use client";

import { Suspense, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
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
  const [iframeReady, setIframeReady] = useState(false);

  const { buildPaths } = useMemo(
    () => getBatchInfo(manifest, currentDate, currentTimestamp),
    [manifest, currentDate, currentTimestamp]
  );

  const hasBuilds = buildPaths.length > 0;

  // Get the active path for current model
  const activePath = useMemo(() => {
    if (!hasBuilds) return null;
    if (currentModel) {
      const found = buildPaths.find((p) => p.model === currentModel);
      if (found) return found.path;
    }
    return buildPaths[0]?.path ?? null;
  }, [buildPaths, currentModel, hasBuilds]);

  // Get the active model for title
  const activeModel = useMemo(() => {
    if (!hasBuilds) return null;
    if (currentModel) {
      const found = buildPaths.find((p) => p.model === currentModel);
      if (found) return found.model;
    }
    return buildPaths[0]?.model ?? null;
  }, [buildPaths, currentModel, hasBuilds]);

  // Reset ready state when path changes
  useEffect(() => {
    setIframeReady(false);
  }, [activePath]);

  // Prefetch all HTML files for faster switching
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

  const handleIframeLoad = useCallback(() => {
    setIframeReady(true);
  }, []);

  return (
    <div className="h-dvh flex flex-col pt-[env(safe-area-inset-top)]">
      {/* Menu bar - fixed height, always on top */}
      <MenuBar
        manifest={manifest}
        currentModel={currentModel}
        currentDate={currentDate}
        currentTimestamp={currentTimestamp}
        onModelChange={setModel}
      />
      
      {/* Content area - fills remaining space, uses iframe for better mobile support */}
      <div className="flex-1 relative min-h-0 bg-neutral-100 dark:bg-[#0a0a0a]">
        {activePath ? (
          <>
            <iframe
              key={activePath}
              src={`/${activePath}`}
              title={`Site built by ${getModelDisplayName(activeModel ?? '')}`}
              className="absolute top-0 left-0 right-0 bottom-[env(safe-area-inset-bottom)] w-full h-auto border-0"
              onLoad={handleIframeLoad}
            />
            {/* Loading overlay that hides the white flash */}
            {!iframeReady && (
              <div className="absolute inset-0 bg-neutral-100 dark:bg-[#0a0a0a] pointer-events-none" />
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-black/60 dark:text-white/60">
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
      <div className="h-[var(--menu-bar-height)] flex items-center justify-between px-3 bg-black/[0.03] dark:bg-white/[0.05] backdrop-blur-2xl backdrop-saturate-[1.8] border-b border-black/[0.04] dark:border-white/[0.08] text-[13px] text-black/80 dark:text-white/80 select-none">
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
