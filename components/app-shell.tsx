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
  const { manifest, currentModel, currentDate, currentTimestamp, currentBuildPath, isLoading, setModel } = useManifest();

  const { batchTimestamp, buildPaths } = useMemo(
    () => getBatchInfo(manifest, currentDate, currentTimestamp),
    [manifest, currentDate, currentTimestamp]
  );

  const hasBuilds = buildPaths.length > 0;
  const batchKey = `${currentDate ?? ""}|${batchTimestamp ?? ""}`;

  const [mountedPaths, setMountedPaths] = useState<{ model: string; path: string }[]>([]);
  const warmedBatchKeyRef = useRef<string | null>(null);

  const resolveActiveEntry = useCallback(() => {
    if (!hasBuilds) return null;
    if (currentModel) {
      const byModel = buildPaths.find((p) => p.model === currentModel);
      if (byModel) return byModel;
    }
    if (currentBuildPath) {
      const byPath = buildPaths.find((p) => p.path === currentBuildPath);
      if (byPath) return byPath;
    }
    return buildPaths[0] ?? null;
  }, [buildPaths, currentBuildPath, currentModel, hasBuilds]);

  const warmUpAllIframes = useCallback(() => {
    if (!hasBuilds) return;
    setMountedPaths(buildPaths);
    warmedBatchKeyRef.current = batchKey;
  }, [batchKey, buildPaths, hasBuilds]);

  // Reset mounted iframes when the batch changes
  useEffect(() => {
    if (!hasBuilds) {
      setMountedPaths([]);
      warmedBatchKeyRef.current = null;
      return;
    }

    const active = resolveActiveEntry();
    setMountedPaths(active ? [active] : []);
    warmedBatchKeyRef.current = null;

    // Warm up all iframes after a short delay
    const timeoutId = setTimeout(() => warmUpAllIframes(), 500);
    return () => clearTimeout(timeoutId);
  }, [batchKey, hasBuilds, resolveActiveEntry, warmUpAllIframes]);

  // Ensure newly selected model is mounted if warm-up hasn't finished
  useEffect(() => {
    if (!hasBuilds || !currentModel) return;
    if (warmedBatchKeyRef.current === batchKey) return;

    const active = buildPaths.find((p) => p.model === currentModel);
    if (!active) return;

    setMountedPaths((prev) => {
      if (prev.some((p) => p.path === active.path)) return prev;
      return [...prev, active];
    });
  }, [batchKey, buildPaths, currentModel, hasBuilds]);

  return (
    <div className="h-full flex flex-col">
      {/* Menu bar - fixed height, always on top */}
      <MenuBar
        manifest={manifest}
        currentModel={currentModel}
        currentDate={currentDate}
        currentTimestamp={currentTimestamp}
        onModelChange={setModel}
      />
      
      {/* Content area - fills remaining space */}
      <div className="flex-1 relative min-h-0">
        {hasBuilds ? (
          <>
            {mountedPaths.map(({ model, path }) => {
              const isActive = model === currentModel;
              return (
                <iframe
                  key={path}
                  src={`/${path}`}
                  title={`Site built by ${getModelDisplayName(model)}`}
                  className="absolute inset-0 w-full h-full border-0"
                  style={{
                    visibility: isActive ? "visible" : "hidden",
                    pointerEvents: isActive ? "auto" : "none",
                  }}
                />
              );
            })}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-black/60">
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
