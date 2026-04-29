"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { track } from "@vercel/analytics";
import { GlobalMenuBar } from "@/components/global-menu-bar";
import { SiteViewer } from "@/components/site-viewer";
import {
  AgentActivityOverlay,
  AgentActivityPanel,
  type AgentActivityItem,
  type AgentActivityKind,
  type AgentActivityStatus,
} from "@/components/agent-activity";

type GenerationStatus = "idle" | "connecting" | "generating" | "complete" | "error";

export default function NewBuildPage() {
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [activity, setActivity] = useState<AgentActivityItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [prompt, setPrompt] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const startTimeRef = useRef<number | null>(null);
  const statusRef = useRef<GenerationStatus>("idle");

  // Throttle partial HTML updates via rAF
  const pendingHtmlRef = useRef<string | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const flushPartialHtml = useCallback(() => {
    if (pendingHtmlRef.current !== null) {
      setHtmlContent(pendingHtmlRef.current);
      pendingHtmlRef.current = null;
    }
    rafIdRef.current = null;
  }, []);

  const enqueuePartialHtml = useCallback((html: string) => {
    pendingHtmlRef.current = html;
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(flushPartialHtml);
    }
  }, [flushPartialHtml]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  // Check availability on mount
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const res = await fetch("/api/generate");
        const data = await res.json();
        if (!data.configured) {
          setError("Agent not configured");
        }
        if (data.cooldownRemaining > 0) {
          setCooldown(data.cooldownRemaining);
        }
      } catch {
        // Ignore
      }
    };
    checkAvailability();
  }, []);

  // Countdown timer for cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Elapsed time counter during generation
  useEffect(() => {
    if ((status !== "connecting" && status !== "generating") || !startTime) return;
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 100);
    return () => clearInterval(timer);
  }, [status, startTime]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [prompt]);

  const upsertActivity = useCallback(
    (incoming: AgentActivityItem) => {
      setActivity((prev) => {
        const idx = prev.findIndex((p) => p.id === incoming.id);
        if (idx === -1) {
          return [...prev, incoming];
        }
        const next = prev.slice();
        // Preserve original timestamp for ordering, but update fields.
        next[idx] = { ...prev[idx], ...incoming, timestamp: prev[idx].timestamp };
        return next;
      });
    },
    []
  );

  const handleGenerate = useCallback(async () => {
    const now = Date.now();
    setStatus("connecting");
    statusRef.current = "connecting";
    setStatusMessage("Connecting to Cursor Cloud...");
    setError(null);
    setHtmlContent("");
    setActivity([]);
    setStartTime(now);
    startTimeRef.current = now;
    setElapsedTime(0);
    pendingHtmlRef.current = null;

    try {
      track("live_generation_started");

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim() || null }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 429) {
          setCooldown(data.retryAfter || 60);
        }
        throw new Error(data.error || "Failed to generate");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          let event: Record<string, unknown> | null = null;
          try {
            event = JSON.parse(line.slice(6));
          } catch {
            continue;
          }
          if (!event) continue;

          if (event.type === "complete") {
            const html = event.html as string | undefined;
            if (html) setHtmlContent(html);
            setStatus("complete");
            statusRef.current = "complete";
            track("live_generation_complete", {
              duration: Math.floor(
                (Date.now() - (startTimeRef.current || Date.now())) / 1000
              ),
            });
          } else if (event.type === "error") {
            throw new Error(event.message as string);
          } else if (event.type === "partial_html") {
            const html = event.html as string;
            if (html) {
              enqueuePartialHtml(html);
              if (statusRef.current === "connecting") {
                setStatus("generating");
                statusRef.current = "generating";
              }
            }
          } else if (event.type === "activity") {
            // Flip from connecting → generating once we see real activity.
            if (statusRef.current === "connecting") {
              setStatus("generating");
              statusRef.current = "generating";
            }
            upsertActivity({
              id: String(event.id),
              kind: event.kind as AgentActivityKind,
              status: event.status as AgentActivityStatus,
              action: String(event.action || ""),
              details:
                typeof event.details === "string" ? event.details : undefined,
              toolName:
                typeof event.toolName === "string" ? event.toolName : undefined,
              timestamp:
                typeof event.timestamp === "number"
                  ? event.timestamp
                  : Date.now(),
            });
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
      setStatus("error");
      statusRef.current = "error";
      track("live_generation_error");
    }
  }, [prompt, enqueuePartialHtml, upsertActivity]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (cooldown <= 0 && !error && status === "idle") {
        handleGenerate();
      }
    }
  };

  const isComplete = status === "complete";
  const isDisabled = cooldown > 0 || !!error || status !== "idle";
  const isStreaming = status === "connecting" || status === "generating";
  const hasStreamedHtml = htmlContent.length > 0 && isStreaming;

  // Most recent running item — used for the overlay over the live preview.
  const currentRunningActivity = useMemo(() => {
    for (let i = activity.length - 1; i >= 0; i--) {
      if (activity[i].status === "running") return activity[i];
    }
    return undefined;
  }, [activity]);

  return (
    <div className="h-dvh flex flex-col bg-[#fafaf9] dark:bg-[#0a0a0a]">
      <GlobalMenuBar
        currentRoute="/new"
        buildComplete={isComplete}
        buildTotalTime={elapsedTime}
      />

      <main className="flex-1 flex flex-col min-h-0">
        {/* Idle: prompt input */}
        {status === "idle" && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-full max-w-[640px] px-6">
              <div className="bg-white dark:bg-white/5 rounded-2xl border border-[#d8d6d1] dark:border-white/10 overflow-hidden">
                <div className="p-4 pb-2">
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe your remix of Erik's website"
                    className="w-full resize-none bg-transparent text-[15px] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none leading-relaxed [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    rows={1}
                    disabled={isDisabled}
                  />
                </div>

                <div className="px-4 pb-3 flex items-center justify-end">
                  <button
                    onClick={handleGenerate}
                    disabled={isDisabled}
                    className="w-8 h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Generate"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="19" x2="12" y2="5" />
                      <polyline points="5 12 12 5 19 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {[
                  "8-bit retro game style",
                  "Brutalist concrete aesthetic",
                  "Y2K nostalgia",
                  "Luxury fashion brand",
                  "Terminal / hacker theme",
                ].map((example) => (
                  <button
                    key={example}
                    onClick={() => setPrompt(example)}
                    disabled={isDisabled}
                    className="px-3 py-1.5 text-[15px] text-gray-500 dark:text-gray-400 bg-white/60 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-300 rounded-full border border-gray-200 dark:border-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {example}
                  </button>
                ))}
              </div>

              {(cooldown > 0 || error) && (
                <p className="text-center text-[15px] text-gray-500 dark:text-gray-400 mt-4">
                  {cooldown > 0 ? (
                    `Available in ${cooldown}s`
                  ) : (
                    <span className="text-red-500">{error}</span>
                  )}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Generating: activity panel OR live iframe + overlay */}
        {isStreaming && (
          <div className="flex-1 flex flex-col min-h-0 relative">
            {hasStreamedHtml ? (
              <>
                <SiteViewer htmlContent={htmlContent} />
                <AgentActivityOverlay
                  current={currentRunningActivity}
                  elapsedSeconds={elapsedTime}
                />
              </>
            ) : (
              <AgentActivityPanel
                items={activity}
                fallbackMessage={statusMessage || "Planning next moves"}
                elapsedSeconds={elapsedTime}
              />
            )}
          </div>
        )}

        {/* Complete: final site + new remix button */}
        {status === "complete" && (
          <div className="flex-1 flex flex-col min-h-0 relative">
            {htmlContent ? (
              <>
                <SiteViewer htmlContent={htmlContent} />
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
                  <button
                    onClick={() => {
                      setStatus("idle");
                      setError(null);
                      setHtmlContent("");
                      setActivity([]);
                    }}
                    className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[15px] rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-lg shadow-black/20 flex items-center gap-2"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    New remix
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center px-4">
                <div className="text-center max-w-md">
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                    Generation complete!
                  </p>
                  <button
                    onClick={() => {
                      setStatus("idle");
                      setError(null);
                      setPrompt("");
                      setActivity([]);
                    }}
                    className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[15px] rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
                  >
                    Generate Another
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="text-center max-w-md">
              <p className="text-2xl font-light text-red-500 mb-4">
                Something went wrong
              </p>
              <p className="text-[15px] text-gray-500 dark:text-gray-400 mb-8">
                {error || "Failed to generate the site"}
              </p>
              <button
                onClick={() => {
                  setStatus("idle");
                  setError(null);
                  setActivity([]);
                }}
                className="px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[15px] rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
