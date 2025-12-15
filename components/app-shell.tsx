"use client";

import { Suspense, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  // Track which iframes have loaded
  const [loadedPaths, setLoadedPaths] = useState<Set<string>>(new Set());
  // Store refs to all iframes by path
  const iframeRefs = useRef<Map<string, HTMLIFrameElement>>(new Map());

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

  // Clear loaded paths when batch changes (date/timestamp changes)
  const batchKey = `${currentDate}-${currentTimestamp}`;
  const prevBatchKeyRef = useRef(batchKey);
  useEffect(() => {
    if (prevBatchKeyRef.current !== batchKey) {
      setLoadedPaths(new Set());
      iframeRefs.current.clear();
      prevBatchKeyRef.current = batchKey;
    }
  }, [batchKey]);

  // Focus the active iframe when it changes to ensure scroll works
  useEffect(() => {
    if (!activePath) return;
    
    // Small delay to ensure DOM is updated
    const timer = setTimeout(() => {
      const activeIframe = iframeRefs.current.get(activePath);
      if (activeIframe) {
        // Focus the iframe to enable scroll interaction
        activeIframe.focus();
      }
    }, 50);
    
    return () => clearTimeout(timer);
  }, [activePath]);

  // Handle iframe load
  const handleIframeLoad = useCallback((path: string) => {
    setLoadedPaths((prev) => {
      const next = new Set(prev);
      next.add(path);
      return next;
    });
  }, []);

  // Store iframe ref
  const setIframeRef = useCallback((path: string, el: HTMLIFrameElement | null) => {
    if (el) {
      iframeRefs.current.set(path, el);
    } else {
      iframeRefs.current.delete(path);
    }
  }, []);

  // Check if the active iframe is loaded
  const activeLoaded = activePath ? loadedPaths.has(activePath) : false;

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
      <div className="flex-1 relative min-h-0 bg-neutral-100 dark:bg-[#0a0a0a] overflow-hidden">
        {hasBuilds ? (
          <>
            {/* Render all iframes but only show the active one */}
            {buildPaths.map(({ model, path }) => {
              const isActive = path === activePath;
              return (
                <iframe
                  key={path}
                  ref={(el) => setIframeRef(path, el)}
                  src={`/${path}`}
                  title={`Site built by ${getModelDisplayName(model)}`}
                  className="absolute inset-0 w-full h-full border-0"
                  tabIndex={isActive ? 0 : -1}
                  style={{
                    // Active iframe: fully visible and interactive
                    // Hidden iframes: invisible but still loaded in background
                    opacity: isActive ? 1 : 0,
                    pointerEvents: isActive ? 'auto' : 'none',
                    zIndex: isActive ? 1 : 0,
                  }}
                  onLoad={() => handleIframeLoad(path)}
                />
              );
            })}
            {/* Loading overlay - only show when active iframe hasn't loaded yet */}
            {!activeLoaded && (
              <div 
                className="absolute inset-0 bg-neutral-100 dark:bg-[#0a0a0a] pointer-events-none"
                style={{ zIndex: 2 }}
              />
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
