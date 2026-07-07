"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { track } from "@vercel/analytics";
import { GlobalMenuBar } from "@/components/global-menu-bar";
import { SiteViewer } from "@/components/site-viewer";

type GenerationStatus = "idle" | "connecting" | "generating" | "complete" | "error";

interface AgentStep {
  id: string;
  label: string;
  timestamp: number;
  duration?: number;
}

function parseStepLabel(text: string, summary?: string): string {
  if (summary?.includes(":") && summary.length < 50) {
    const [tool, file] = summary.split(":");
    const toolName = tool.trim().toLowerCase();
    const fileName = file?.trim() || "";
    
    if (toolName === "write" || toolName === "edit_file" || toolName === "search_replace") {
      return `Writing ${fileName}`;
    }
    if (toolName === "read_file" || toolName === "read") {
      return `Reading ${fileName}`;
    }
    if (toolName === "codebase_search" || toolName === "grep") {
      return `Searching codebase`;
    }
    return summary;
  }

  let source = summary && summary.length > 0 && summary.length <= 100
    ? summary
    : text.split("\n")[0].trim();
  
  const firstSentence = source.split(/[.!?]/)[0].trim();
  if (firstSentence.length < source.length && firstSentence.length > 10) {
    source = firstSentence;
  }
  
  let cleaned = source
    .replace(/^now\s+i\s+(have|need|will|am|can|should|want)/i, "")
    .replace(/^i('ll|'m| will| am| need to| want to| can| should| have)\s+/i, "")
    .replace(/^(let me|let's)\s+/i, "")
    .replace(/^(first|next|now),?\s*(i('ll|'m| will| am| need to)?\s*)?/i, "")
    .trim();
  
  if (cleaned.length < 5) {
    const lower = source.toLowerCase();
    if (lower.includes("context") || lower.includes("read")) return "Reading context";
    if (lower.includes("design") || lower.includes("style")) return "Planning design";
    if (lower.includes("writ") || lower.includes("creat")) return "Building site";
    if (lower.includes("html") || lower.includes("css")) return "Writing code";
    return "Working";
  }
  
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  if (cleaned.length > 60) return cleaned.slice(0, 57) + "...";
  return cleaned;
}

export default function NewBuildPage() {
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [prompt, setPrompt] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stepsContainerRef = useRef<HTMLDivElement>(null);
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

  // Auto-scroll to bottom when new steps arrive
  useEffect(() => {
    if (stepsContainerRef.current && steps.length > 0) {
      stepsContainerRef.current.scrollTop = stepsContainerRef.current.scrollHeight;
    }
  }, [steps]);

  const handleGenerate = useCallback(async () => {
    const now = Date.now();
    setStatus("connecting");
    statusRef.current = "connecting";
    setStatusMessage("Connecting to Cursor Cloud...");
    setError(null);
    setHtmlContent("");
    setSteps([]);
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
              // Transition to generating on first HTML chunk
              if (statusRef.current === "connecting") {
                setStatus("generating");
                statusRef.current = "generating";
              }
            }
          } else if (event.type === "text_delta") {
            // text deltas are informational — no UI action needed beyond steps
          } else if (event.type === "step") {
            const text = event.text as string || "";
            const summary = event.summary as string | undefined;
            const label = parseStepLabel(text, summary);
            const stepNow = Date.now();

            setSteps((prev) => {
              if (prev.some((s) => s.id === event.id)) return prev;
              const lastStep = prev[prev.length - 1];
              if (lastStep && lastStep.label === label) return prev;

              const updated = prev.map((s, i) => {
                if (i === prev.length - 1 && !s.duration) {
                  return { ...s, duration: Math.round((stepNow - s.timestamp) / 1000) };
                }
                return s;
              });

              return [...updated, { id: event.id as string, label, timestamp: stepNow }];
            });
          } else if (event.type === "status") {
            if (statusRef.current === "connecting") {
              setStatus("generating");
              statusRef.current = "generating";
            }
            setStatusMessage((event.message as string) || "Working...");
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
      setStatus("error");
      statusRef.current = "error";
      track("live_generation_error");
    }
  }, [prompt, enqueuePartialHtml]);

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

  return (
    <div className="h-dvh flex flex-col bg-page">
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

        {/* Generating: steps card OR live iframe */}
        {isStreaming && (
          <div className="flex-1 flex flex-col min-h-0 relative">
            {hasStreamedHtml ? (
              <>
                <SiteViewer htmlContent={htmlContent} />
                {/* Floating status overlay */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-black/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-black/5 dark:border-white/10 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-pulse" />
                  <span className="text-[13px] text-gray-500 dark:text-gray-400 tabular-nums">
                    Building... {elapsedTime}s
                  </span>
                </div>
              </>
            ) : (
              <div className="flex-1 mx-4 my-4 bg-white dark:bg-white/5 rounded-xl shadow-sm border border-black/5 dark:border-white/10 flex flex-col overflow-hidden">
                <div
                  ref={stepsContainerRef}
                  className="flex-1 overflow-y-auto px-6 py-6"
                >
                  <div className="space-y-0">
                    {steps.map((step) => {
                      const isActive = !step.duration;
                      return (
                        <div key={step.id} className="flex items-baseline justify-between py-1">
                          <span
                            className={`text-[15px] leading-relaxed ${
                              isActive ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-400 dark:text-gray-500"
                            }`}
                          >
                            {step.label}
                          </span>
                          <span className="text-gray-300 dark:text-gray-600 text-[13px] tabular-nums ml-4 flex-shrink-0">
                            {step.duration !== undefined ? `${step.duration}s` : "0s"}
                          </span>
                        </div>
                      );
                    })}

                    <div className="flex items-center gap-2 pt-3">
                      <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-pulse" />
                      {steps.length === 0 ? (
                        <span className="text-gray-400 dark:text-gray-500 text-[15px]">
                          {statusMessage || "Launching agent..."} <span className="tabular-nums">({elapsedTime}s)</span>
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-[15px] tabular-nums">{elapsedTime}s</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
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
                      setSteps([]);
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
                      setSteps([]);
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
                  setSteps([]);
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
