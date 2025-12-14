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
  const iframeRefsMap = useRef<Map<string, HTMLIFrameElement>>(new Map());

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

  // Manage inert attribute on iframes after DOM commits - Safari needs explicit DOM manipulation
  useEffect(() => {
    // Run after paint to ensure browser has processed any pending layout
    const rafId = requestAnimationFrame(() => {
      iframeRefsMap.current.forEach((el, path) => {
        const entry = mountedPaths.find((p) => p.path === path);
        if (!entry) return;
        
        const isActive = entry.model === currentModel;
        if (isActive) {
          el.removeAttribute("inert");
          // Double RAF to ensure Safari processes the attribute change
          requestAnimationFrame(() => {
            try {
              // Trigger a layout recalculation
              void el.contentDocument?.body?.offsetHeight;
            } catch {
              // Cross-origin or not loaded yet
            }
          });
        } else {
          el.setAttribute("inert", "");
        }
      });
    });
    return () => cancelAnimationFrame(rafId);
  }, [currentModel, mountedPaths]);

  return (
    <>
      <MenuBar
        manifest={manifest}
        currentModel={currentModel}
        currentDate={currentDate}
        currentTimestamp={currentTimestamp}
        onModelChange={setModel}
      />
      <main 
        className="fixed left-0 right-0 bottom-0"
        style={{
          top: "var(--menu-bar-height)",
        }}
      >
        {hasBuilds ? (
          <>
            {mountedPaths.map(({ model, path }) => {
              const isActive = model === currentModel;
              // Use z-index stacking and visibility for robust iframe switching.
              // visibility:hidden preserves iframe state in Safari (unlike display:none).
              // Iframes scroll natively on iOS - no wrapper needed.
              return (
                <iframe
                  key={path}
                  ref={(el) => {
                    if (el) {
                      iframeRefsMap.current.set(path, el);
                    } else {
                      iframeRefsMap.current.delete(path);
                    }
                  }}
                  src={`/${path}`}
                  title={`Site built by ${getModelDisplayName(model)}`}
                  className="absolute inset-0 w-full h-full border-0"
                  style={{
                    zIndex: isActive ? 1 : 0,
                    visibility: isActive ? "visible" : "hidden",
                    pointerEvents: isActive ? "auto" : "none",
                  }}
                />
              );
            })}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-white/60">
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

