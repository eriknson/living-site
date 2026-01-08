"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ManifestProvider, useManifest } from "@/lib/manifest-context";
import { GlobalMenuBar } from "@/components/global-menu-bar";
import { SiteViewer } from "@/components/site-viewer";
import { AnimatedContent } from "@/components/animated-content";
import { getBatch, type Manifest } from "@/lib/manifest";

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

function AgentContent() {
  const { manifest, currentModel, currentDate, currentTimestamp, isLoading, setModel } = useManifest();
  const [contentReady, setContentReady] = useState(false);

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

  // Reset ready state when path changes
  useEffect(() => {
    setContentReady(false);
  }, [activePath]);

  // Prefetch all HTML files for faster switching
  useEffect(() => {
    if (!buildPaths.length) return;
    
    const links: HTMLLinkElement[] = [];
    buildPaths.forEach(({ path }) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = `/${path}`;
      link.as = 'fetch';
      document.head.appendChild(link);
      links.push(link);
    });
    
    return () => {
      links.forEach(link => link.remove());
    };
  }, [buildPaths]);

  const handleContentLoad = useCallback(() => {
    setContentReady(true);
  }, []);

  return (
    <div className="h-dvh flex flex-col">
      {/* Menu bar */}
      <GlobalMenuBar
        currentRoute="/agent"
        manifest={manifest}
        currentModel={currentModel}
        currentDate={currentDate}
        currentTimestamp={currentTimestamp}
        onModelChange={setModel}
      />
      
      {/* Content area - fills remaining space */}
      <div className="relative flex-1 flex flex-col min-h-0 bg-[#002FA7] pb-[env(safe-area-inset-bottom)]">
        {activePath ? (
          <>
            <AnimatedContent 
              contentKey={activePath} 
              className="flex-1 flex flex-col min-h-0"
            >
              <SiteViewer
                key={activePath}
                src={`/${activePath}`}
                onLoad={handleContentLoad}
              />
            </AnimatedContent>
            {/* Loading overlay OUTSIDE AnimatedContent to avoid being animated away */}
            {!contentReady && (
              <div className="absolute inset-0 bg-[#002FA7] pointer-events-none z-10" />
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/60">
            <p>{isLoading ? "Loading..." : "No build available"}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentPage() {
  return (
    <Suspense fallback={<GlobalMenuBar currentRoute="/agent" />}>
      <ManifestProvider>
        <AgentContent />
      </ManifestProvider>
    </Suspense>
  );
}
