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

  const supportsInert = useMemo(() => {
    // `inert` is now supported in modern Safari/Chrome, but we keep a fallback path.
    // This component is client-only, so `document` exists.
    try {
      return "inert" in document.createElement("div");
    } catch {
      return false;
    }
  }, []);

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

  // Reset mounted iframes when the batch changes: mount only the active one, then warm the others in idle time / after first interaction.
  useEffect(() => {
    if (!hasBuilds) {
      setMountedPaths([]);
      warmedBatchKeyRef.current = null;
      return;
    }

    const active = resolveActiveEntry();
    setMountedPaths(active ? [active] : []);
    warmedBatchKeyRef.current = null;

    let cancelled = false;

    const triggerWarm = () => {
      if (cancelled) return;
      warmUpAllIframes();
      cleanupInteractionListeners();
    };

    const onFirstInteraction = () => triggerWarm();

    const interactionRemoveOptions = { capture: true } as const;
    const cleanupInteractionListeners = () => {
      window.removeEventListener("pointerdown", onFirstInteraction, interactionRemoveOptions);
      window.removeEventListener("keydown", onFirstInteraction, interactionRemoveOptions);
    };

    window.addEventListener("pointerdown", onFirstInteraction, { capture: true, once: true });
    window.addEventListener("keydown", onFirstInteraction, { capture: true, once: true });

    // Warm in idle time (or soon-ish) so switching feels instant shortly after load.
    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if ("requestIdleCallback" in window) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      idleId = (window as any).requestIdleCallback(() => triggerWarm(), { timeout: 1200 });
    } else {
      timeoutId = setTimeout(() => triggerWarm(), 350);
    }

    return () => {
      cancelled = true;
      cleanupInteractionListeners();
      if (idleId !== null && "cancelIdleCallback" in window) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, [batchKey, hasBuilds, resolveActiveEntry, warmUpAllIframes]);

  // If the user switches models before warm-up finished, ensure the newly active model is mounted immediately.
  useEffect(() => {
    if (!hasBuilds) return;
    if (!currentModel) return;
    if (warmedBatchKeyRef.current === batchKey) return;

    const active = buildPaths.find((p) => p.model === currentModel);
    if (!active) return;

    setMountedPaths((prev) => {
      if (prev.some((p) => p.path === active.path)) return prev;
      return [...prev, active];
    });
  }, [batchKey, buildPaths, currentModel, hasBuilds]);

  return (
    <>
      <MenuBar
        manifest={manifest}
        currentModel={currentModel}
        currentDate={currentDate}
        currentTimestamp={currentTimestamp}
        onModelChange={setModel}
      />
      <main className="fixed inset-0">
        {hasBuilds ? (
          <div className="relative w-full h-full">
            {mountedPaths.map(({ model, path }) => {
              const isActive = model === currentModel;
              // Use a combination of z-index stacking and inert attribute for robust
              // iframe switching. The active iframe is on top with z-index, inactive
              // iframes use inert to prevent any interaction including scroll capture.
              return (
                <iframe
                  key={path}
                  ref={(el) => {
                    if (!el) return;
                    // Explicitly remove/set inert attribute via DOM API to work around
                    // Safari bug where toggling via React doesn't restore scroll.
                    if (isActive) {
                      el.removeAttribute("inert");
                    } else {
                      el.setAttribute("inert", "");
                    }
                  }}
                  src={`/${path}`}
                  title={`Site built by ${getModelDisplayName(model)}`}
                  className="absolute inset-0 w-full h-full border-0"
                  style={{
                    // Never let an inactive iframe sit "above" the active one (even if many are mounted).
                    zIndex: isActive ? 1 : 0,
                    opacity: isActive ? 1 : 0,
                    pointerEvents: isActive ? "auto" : "none",
                    // If `inert` isn't supported, ensure inactive iframes can't interfere with scroll/touch
                    // by removing them from rendering while still allowing them to load/prewarm.
                    display: !supportsInert && !isActive ? "none" : "block",
                  }}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-black/60">
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
      <div className="fixed top-0 left-0 right-0 h-[var(--menu-bar-height)] z-50 flex items-center justify-between px-3 bg-black/[0.03] backdrop-blur-2xl backdrop-saturate-[1.8] border-b border-black/[0.04] text-[13px] text-black/80 select-none">
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

