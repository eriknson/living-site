"use client";

import { useCallback, useEffect, useState } from "react";
import { track } from "@vercel/analytics";
import { GlobalMenuBar } from "@/components/global-menu-bar";
import { SiteViewer } from "@/components/site-viewer";
import { StepList } from "@/components/build-views/step-list";
import { Step, deriveStep, processEvent } from "@/lib/step-types";

type GenerationStatus = "idle" | "running" | "complete" | "error";

export default function NewBuildPage() {
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  // Check availability on mount
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const res = await fetch("/api/generate");
        const data = await res.json();
        if (!data.hasApiKey && !data.flyReady) {
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
    if (status !== "running" || !startTime) return;
    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 100);
    return () => clearInterval(timer);
  }, [status, startTime]);

  // Complete the last step when generation ends
  const completeLastStep = useCallback(() => {
    setSteps((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.completedAt) return prev;
      return prev.map((s, i) =>
        i === prev.length - 1 ? { ...s, completedAt: Date.now() } : s
      );
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    setStatus("running");
    setError(null);
    setHtmlContent("");
    setSteps([]);
    setStartTime(Date.now());
    setElapsedTime(0);

    // #region agent log
    const genStartTime = Date.now();
    fetch('http://127.0.0.1:7242/ingest/7b82bf8a-7c03-4697-b719-1e325f7e9340',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:handleGenerate:start',message:'Client: handleGenerate started',data:{},timestamp:genStartTime,sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
    // #endregion

    try {
      track("live_generation_started");

      // #region agent log
      const postFetchStart = Date.now();
      // #endregion
      const res = await fetch("/api/generate", { method: "POST" });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/7b82bf8a-7c03-4697-b719-1e325f7e9340',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:handleGenerate:postFetchComplete',message:'Client: POST fetch response received',data:{postFetchMs:Date.now()-postFetchStart,ok:res.ok,status:res.status},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D'})}).catch(()=>{});
      // #endregion

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
      let firstStepLogged = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const rawData = line.slice(6);

            // Try to parse as JSON
            let event: Record<string, unknown> | null = null;
            try {
              event = JSON.parse(rawData);
            } catch {
              // Not JSON - could be spawn event
            }

            // Check for completion/error events
            if (event) {
              if (event.type === "complete") {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/7b82bf8a-7c03-4697-b719-1e325f7e9340',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:handleGenerate:complete',message:'Client: Generation complete event received',data:{totalMs:Date.now()-genStartTime,hasHtml:!!(event.html)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
                // #endregion
                completeLastStep();
                const html = event.html as string | undefined;
                if (html) {
                  setHtmlContent(html);
                }
                setStatus("complete");
                track("live_generation_complete", {
                  duration: Math.floor(
                    (Date.now() - (startTime || Date.now())) / 1000
                  ),
                });
                continue;
              } else if (event.type === "error") {
                throw new Error(event.message as string);
              }
            }

            // Derive step from event
            const derived = deriveStep(event, rawData);
            if (derived) {
              // #region agent log - track first step received
              if (derived.label && !firstStepLogged) {
                firstStepLogged = true;
                fetch('http://127.0.0.1:7242/ingest/7b82bf8a-7c03-4697-b719-1e325f7e9340',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:handleGenerate:firstStep',message:'Client: First step received',data:{msToFirstStep:Date.now()-genStartTime,stepLabel:derived.label},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
              }
              // #endregion
              setSteps((prev) => processEvent(prev, derived));
            }
          }
        }
      }
    } catch (e) {
      console.error("Generation error:", e);
      completeLastStep();
      setError(e instanceof Error ? e.message : "Generation failed");
      setStatus("error");
      track("live_generation_error");
    }
  }, [completeLastStep, startTime]);

  const isBuilding = status === "running";
  const isComplete = status === "complete";

  return (
    <div className="h-dvh flex flex-col bg-white dark:bg-[#0a0a0a]">
      {/* Menu bar - consistent with /agent */}
      <GlobalMenuBar
        currentRoute="/new"
        isBuilding={isBuilding}
        buildElapsed={elapsedTime}
        buildComplete={isComplete}
        buildTotalTime={elapsedTime}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-0">
        {status === "idle" && (
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="text-center max-w-md">
              <h1 className="text-2xl font-light text-black/90 dark:text-white/90 mb-4">
                Generate a new site
              </h1>
              <p className="text-sm text-black/50 dark:text-white/50 mb-8 leading-relaxed">
                Composer-1 will create a unique interpretation of your personal
                website based on your recent activity. Takes about 15-20
                seconds.
              </p>

              {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

              <button
                onClick={handleGenerate}
                disabled={cooldown > 0 || !!error}
                className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black text-sm rounded-full hover:bg-black/80 dark:hover:bg-white/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cooldown > 0 ? `Wait ${cooldown}s` : "Start Generation"}
              </button>
            </div>
          </div>
        )}

        {status === "running" && (
          <div className="flex-1 px-6 py-6 overflow-auto">
            <StepList steps={steps} />
          </div>
        )}

        {status === "complete" && (
          <div className="flex-1 flex flex-col min-h-0">
            {htmlContent ? (
              <SiteViewer htmlContent={htmlContent} />
            ) : (
              /* No HTML - show success message */
              <div className="flex-1 flex flex-col items-center justify-center px-4">
                <div className="text-center max-w-md">
                  <p className="text-lg text-black/70 dark:text-white/70 mb-4">
                    Generation complete!
                  </p>
                  <button
                    onClick={() => {
                      setStatus("idle");
                      setError(null);
                    }}
                    className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black text-sm rounded-full hover:bg-black/80 dark:hover:bg-white/80 transition-colors"
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
              <p className="text-sm text-black/50 dark:text-white/50 mb-8">
                {error || "Failed to generate the site"}
              </p>
              <button
                onClick={() => {
                  setStatus("idle");
                  setError(null);
                }}
                className="px-6 py-2.5 bg-black dark:bg-white text-white dark:text-black text-sm rounded-full hover:bg-black/80 dark:hover:bg-white/80 transition-colors"
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
