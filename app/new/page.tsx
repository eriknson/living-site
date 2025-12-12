"use client";

import { useCallback, useEffect, useState } from "react";
import { NaturalView } from "@/components/build-views/natural-view";
import { TerminalView } from "@/components/build-views/terminal-view";
import { ViewModeMenu } from "@/components/view-mode-menu";
import type { BuildState, BuildEvent, SSEMessage } from "@/lib/build-types";

type ViewMode = "natural" | "terminal";

export default function NewBuildPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("natural");
  const [buildId, setBuildId] = useState<string | null>(null);
  const [buildState, setBuildState] = useState<BuildState | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing build on mount
  useEffect(() => {
    const checkExisting = async () => {
      try {
        const res = await fetch("/api/build");
        const data = await res.json();
        if (data.currentBuild && data.state?.status === "running") {
          setBuildId(data.currentBuild);
          setBuildState(data.state);
        }
      } catch {
        // Ignore errors on initial check
      }
    };
    checkExisting();
  }, []);

  // Subscribe to SSE when we have a buildId
  useEffect(() => {
    if (!buildId) return;

    const eventSource = new EventSource(`/api/build/stream?id=${buildId}`);

    eventSource.onmessage = (event) => {
      try {
        const message: SSEMessage = JSON.parse(event.data);

        switch (message.type) {
          case "state":
            setBuildState(message.data as BuildState);
            break;

          case "event":
            // Events are already processed server-side into state
            // But we could use them for additional UI updates
            break;

          case "done":
            eventSource.close();
            break;

          case "error":
            setError(message.data as string);
            eventSource.close();
            break;
        }
      } catch (e) {
        console.error("Failed to parse SSE message:", e);
      }
    };

    eventSource.onerror = () => {
      // SSE will auto-reconnect, but if it keeps failing we should handle it
      console.error("SSE connection error");
    };

    return () => {
      eventSource.close();
    };
  }, [buildId]);

  const handleStart = useCallback(async () => {
    setIsStarting(true);
    setError(null);

    try {
      const res = await fetch("/api/build", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start build");
        setIsStarting(false);
        return;
      }

      setBuildId(data.buildId);
      // State will be populated by SSE
    } catch (e) {
      setError("Failed to start build");
      console.error(e);
    } finally {
      setIsStarting(false);
    }
  }, []);

  return (
    <>
      {/* Menu bar */}
      <nav className="fixed top-0 left-0 right-0 h-[var(--menu-bar-height)] z-50 flex items-center justify-between px-3 bg-white/40 backdrop-blur-md backdrop-saturate-150 border-b border-black/5 text-[13px] text-black/85 select-none">
        <div className="flex items-center h-full">
          {/* Black circle on very small screens */}
          <span className="h-full px-2.5 flex items-center min-[375px]:hidden">
            <span className="w-3 h-3 bg-black rounded-full" />
          </span>
          {/* Full text on larger screens */}
          <a
            href="/"
            className="h-full px-2.5 font-semibold hidden min-[375px]:flex items-center hover:bg-black/5 transition-colors"
          >
            eriks.design
          </a>

          {/* View mode menu */}
          <ViewModeMenu value={viewMode} onChange={setViewMode} />
        </div>

        <div className="flex items-center h-full">
          {/* Build status indicator */}
          {buildState && (
            <div className="flex items-center gap-2 px-2.5 text-xs text-black/60">
              <span
                className={`w-2 h-2 rounded-full ${
                  buildState.status === "running"
                    ? "bg-amber-500 animate-pulse"
                    : buildState.status === "complete"
                      ? "bg-green-500"
                      : "bg-red-500"
                }`}
              />
              <span>
                {buildState.status === "running"
                  ? "Building..."
                  : buildState.status === "complete"
                    ? "Complete"
                    : "Failed"}
              </span>
            </div>
          )}
        </div>
      </nav>

      {/* View content */}
      {viewMode === "natural" ? (
        <NaturalView
          state={buildState}
          onStart={handleStart}
          isStarting={isStarting}
        />
      ) : (
        <TerminalView
          state={buildState}
          onStart={handleStart}
          isStarting={isStarting}
        />
      )}

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-100 text-red-800 text-sm rounded-lg border border-red-200">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-3 text-red-600 hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}

