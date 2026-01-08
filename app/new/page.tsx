"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { track } from "@vercel/analytics";
import { useRouter } from "next/navigation";
import { GlobalMenuBar } from "@/components/global-menu-bar";
import { SiteViewer } from "@/components/site-viewer";

// Feature flag - set to true to enable the new generation feature
const FEATURE_ENABLED = false;

type GenerationStatus = "idle" | "connecting" | "generating" | "complete" | "error";

interface AgentStep {
  id: string;
  label: string;
  timestamp: number;
  duration?: number; // duration in seconds when step completed
}

// Parse agent message into a step label - keep it close to the original summary
function parseStepLabel(text: string, summary?: string): string {
  // Handle tool call summaries (e.g., "write: live.html")
  if (summary?.includes(":") && summary.length < 50) {
    const [tool, file] = summary.split(":");
    const toolName = tool.trim().toLowerCase();
    const fileName = file?.trim() || "";
    
    // Format tool calls nicely
    if (toolName === "write" || toolName === "edit_file" || toolName === "search_replace") {
      return `Writing ${fileName}`;
    }
    if (toolName === "read_file" || toolName === "read") {
      return `Reading ${fileName}`;
    }
    if (toolName === "codebase_search" || toolName === "grep") {
      return `Searching codebase`;
    }
    // Return as-is for other tool calls
    return summary;
  }

  // Choose source text
  let source = summary && summary.length > 0 && summary.length <= 100
    ? summary
    : text.split("\n")[0].trim();
  
  // Get first sentence if too long
  const firstSentence = source.split(/[.!?]/)[0].trim();
  if (firstSentence.length < source.length && firstSentence.length > 10) {
    source = firstSentence;
  }
  
  // Clean up common AI prefixes more aggressively
  let cleaned = source
    // Remove "Now I have/need/will/etc"
    .replace(/^now\s+i\s+(have|need|will|am|can|should|want)/i, "")
    // Remove "I'll/I'm/I will/I am/etc"  
    .replace(/^i('ll|'m| will| am| need to| want to| can| should| have)\s+/i, "")
    // Remove "Let me/Let's"
    .replace(/^(let me|let's)\s+/i, "")
    // Remove "First/Next, I'll" patterns
    .replace(/^(first|next|now),?\s*(i('ll|'m| will| am| need to)?\s*)?/i, "")
    .trim();
  
  // If we cleaned too much, use a descriptive fallback based on keywords
  if (cleaned.length < 5) {
    const lower = source.toLowerCase();
    if (lower.includes("context") || lower.includes("read")) {
      return "Reading context";
    }
    if (lower.includes("design") || lower.includes("style")) {
      return "Planning design";
    }
    if (lower.includes("writ") || lower.includes("creat")) {
      return "Building site";
    }
    if (lower.includes("html") || lower.includes("css")) {
      return "Writing code";
    }
    return "Working";
  }
  
  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  
  // Truncate if still too long
  if (cleaned.length > 60) {
    return cleaned.slice(0, 57) + "...";
  }
  
  return cleaned;
}

export default function NewBuildPage() {
  const router = useRouter();
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [prompt, setPrompt] = useState<string>("");
  const [agentUrl, setAgentUrl] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stepsContainerRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number | null>(null);
  const statusRef = useRef<GenerationStatus>("idle");

  // Coming soon state - show disabled chat interface
  if (!FEATURE_ENABLED) {
    const suggestions = [
      "90s homepage",
      "Brutalist layout",
      "Festive holiday",
      "Neon cyberpunk",
    ];

    return (
      <div className="h-dvh flex flex-col bg-[#FFD700] text-black">
        <GlobalMenuBar currentRoute="/new" />
        <main className="flex-1 flex flex-col items-center justify-center min-h-0 px-4">
          <div className="w-full max-w-[400px]">
            {/* Suggestions grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  disabled
                  className="px-3 py-2.5 text-[13px] text-black/25 dark:text-white/20 bg-black/[0.03] dark:bg-white/[0.04] rounded-lg cursor-not-allowed"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Chat input card - disabled state */}
            <div className="bg-white dark:bg-white/5 rounded-2xl border border-[#d8d6d1] dark:border-white/10 overflow-hidden opacity-50">
              {/* Textarea */}
              <div className="p-4 pb-2">
                <textarea
                  placeholder="Coming soon: Remix Erik's website"
                  className="w-full resize-none bg-transparent text-[15px] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none leading-relaxed cursor-not-allowed"
                  rows={1}
                  disabled
                />
              </div>

              {/* Bottom bar */}
              <div className="px-4 pb-3 flex items-center justify-end">
                {/* Submit button */}
                <button
                  disabled
                  className="w-8 h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center opacity-30 cursor-not-allowed"
                  aria-label="Generate"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

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
    setAgentUrl(null);

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
          if (line.startsWith("data: ")) {
            const rawData = line.slice(6);

            let event: Record<string, unknown> | null = null;
            try {
              event = JSON.parse(rawData);
            } catch {
              continue;
            }

            if (!event) continue;

            // Handle different event types
            if (event.type === "complete") {
              const html = event.html as string | undefined;
              if (html) {
                setHtmlContent(html);
              }
              setStatus("complete");
              statusRef.current = "complete";
              track("live_generation_complete", {
                duration: Math.floor(
                  (Date.now() - (startTimeRef.current || Date.now())) / 1000
                ),
              });
            } else if (event.type === "error") {
              throw new Error(event.message as string);
                            } else if (event.type === "step") {
                              const text = event.text as string || "";
                              const summary = event.summary as string | undefined;
                              const label = parseStepLabel(text, summary);
                              const now = Date.now();
                              
                              setSteps((prev) => {
                                // Skip if duplicate ID
                                if (prev.some((s) => s.id === event.id)) return prev;
                                
                                // Skip if same label as last step (consolidate duplicates)
                                const lastStep = prev[prev.length - 1];
                                if (lastStep && lastStep.label === label) {
                                  return prev;
                                }
                                
                                // Mark previous step as complete with duration
                                const updated = prev.map((s, i) => {
                                  if (i === prev.length - 1 && !s.duration) {
                                    return { ...s, duration: Math.round((now - s.timestamp) / 1000) };
                                  }
                                  return s;
                                });
                                
                                // Add new step
                                return [...updated, {
                                  id: event.id as string,
                                  label,
                                  timestamp: now,
                                }];
                              });
                            } else if (event.type === "status") {
                              // Transition to generating once we get first status update
                              if (statusRef.current === "connecting") {
                                setStatus("generating");
                                statusRef.current = "generating";
                              }

                              // Update status message
                              const message = event.message as string || "Working...";
                              setStatusMessage(message);

                              // Store agent URL if provided
                              if (event.agentUrl) {
                                setAgentUrl(event.agentUrl as string);
                              }
                            }
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
      setStatus("error");
      statusRef.current = "error";
      track("live_generation_error");
    }
  }, [prompt]);

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

  return (
    <div className="h-dvh flex flex-col bg-[#fafaf9] dark:bg-[#0a0a0a]">
      {/* Menu bar */}
      <GlobalMenuBar
        currentRoute="/new"
        buildComplete={isComplete}
        buildTotalTime={elapsedTime}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-0">
        {status === "idle" && (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-full max-w-[640px] px-6">
              {/* Chat input card */}
              <div className="bg-white dark:bg-white/5 rounded-2xl border border-[#d8d6d1] dark:border-white/10 overflow-hidden">
                {/* Textarea */}
                <div className="p-4 pb-2">
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe your remix of Erik's website"
                    className="w-full resize-none bg-transparent text-[15px] text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none leading-relaxed"
                    rows={1}
                    disabled={isDisabled}
                  />
                </div>

                {/* Bottom bar */}
                <div className="px-4 pb-3 flex items-center justify-end">
                  {/* Submit button */}
                  <button
                    onClick={handleGenerate}
                    disabled={isDisabled}
                    className="w-8 h-8 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Generate"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="12" y1="19" x2="12" y2="5" />
                      <polyline points="5 12 12 5 19 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Example prompts */}
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

              {/* Status text - only show when there's a cooldown or error */}
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

        {(status === "connecting" || status === "generating") && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Card container */}
            <div className="flex-1 mx-4 my-4 bg-white dark:bg-white/5 rounded-xl shadow-sm border border-black/5 dark:border-white/10 flex flex-col overflow-hidden">
              {/* Steps list - matches Cursor Cloud agent style */}
              <div
                ref={stepsContainerRef}
                className="flex-1 overflow-y-auto px-6 py-6"
              >
                <div className="space-y-0">
                  {/* Completed steps */}
                  {steps.map((step) => {
                    const isActive = !step.duration;
                    
                    return (
                      <div 
                        key={step.id}
                        className="flex items-baseline justify-between py-1"
                      >
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
                  
                  {/* Current activity indicator with elapsed time */}
                  <div className="flex items-center gap-2 pt-3">
                    <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-pulse" />
                    {/* Show status message when no steps yet, otherwise just elapsed time */}
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

              {/* Footer with agent link */}
              {agentUrl && (
                <div className="px-6 pb-4 border-t border-gray-100 dark:border-white/10 pt-3">
                  <a
                    href={agentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[15px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 underline underline-offset-2"
                  >
                    View agent in Cursor
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {status === "complete" && (
          <div className="flex-1 flex flex-col min-h-0 relative">
            {htmlContent ? (
              <>
                <SiteViewer htmlContent={htmlContent} />
                {/* Floating new remix button */}
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
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
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
