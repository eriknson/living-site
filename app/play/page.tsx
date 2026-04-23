"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { GamesManifestProvider, useGamesManifest } from "@/lib/games-manifest-context";
import { GlobalMenuBar } from "@/components/global-menu-bar";
import { GameViewer } from "@/components/game-viewer";
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

function PlayContent() {
  const { manifest, currentModel, currentDate, currentTimestamp, isLoading, setModel } = useGamesManifest();
  const [contentReady, setContentReady] = useState(false);
  const [immersive, setImmersive] = useState(false);

  const { buildPaths } = useMemo(
    () => getBatchInfo(manifest, currentDate, currentTimestamp),
    [manifest, currentDate, currentTimestamp]
  );

  const hasBuilds = buildPaths.length > 0;

  const activePath = useMemo(() => {
    if (!hasBuilds) return null;
    if (currentModel) {
      const found = buildPaths.find((p) => p.model === currentModel);
      if (found) return found.path;
    }
    return buildPaths[0]?.path ?? null;
  }, [buildPaths, currentModel, hasBuilds]);

  useEffect(() => {
    setContentReady(false);
  }, [activePath]);

  useEffect(() => {
    if (!buildPaths.length) return;

    const links: HTMLLinkElement[] = [];
    buildPaths.forEach(({ path }) => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = `/${path}`;
      link.as = "document";
      document.head.appendChild(link);
      links.push(link);
    });

    return () => {
      links.forEach((link) => link.remove());
    };
  }, [buildPaths]);

  const handleContentLoad = useCallback(() => {
    setContentReady(true);
  }, []);

  return (
    <div className="h-dvh flex flex-col">
      {!immersive && (
        <GlobalMenuBar
          currentRoute="/play"
          manifest={manifest}
          currentModel={currentModel}
          currentDate={currentDate}
          currentTimestamp={currentTimestamp}
          onModelChange={setModel}
        />
      )}

      <div className="relative flex-1 flex flex-col min-h-0 bg-black pb-[env(safe-area-inset-bottom)]">
        {activePath ? (
          <>
            <AnimatedContent
              contentKey={activePath}
              className="flex-1 flex flex-col min-h-0"
            >
              <GameViewer
                key={activePath}
                src={`/${activePath}`}
                onLoad={handleContentLoad}
              />
            </AnimatedContent>
            {!contentReady && (
              <div className="absolute inset-0 bg-black pointer-events-none z-10" />
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/60">
            <p>{isLoading ? "Loading..." : "No game available"}</p>
          </div>
        )}

        {contentReady && activePath && (
          <button
            onClick={() => setImmersive((v) => !v)}
            className="absolute top-2 right-2 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-sm text-white/60 hover:text-white hover:bg-white/20 transition-colors"
            aria-label={immersive ? "Show menu" : "Fullscreen game"}
          >
            {immersive ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M4 6V4h2M10 4h2v2M12 10v2h-2M6 12H4v-2" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M6 4H4v2M12 6V4h-2M10 12h2v-2M4 10v2h2" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<GlobalMenuBar currentRoute="/play" />}>
      <GamesManifestProvider>
        <PlayContent />
      </GamesManifestProvider>
    </Suspense>
  );
}
