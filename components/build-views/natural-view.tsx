"use client";

import { useEffect, useState } from "react";
import type { BuildState } from "@/lib/build-types";
import { deriveNaturalStatus, getSubtextsForPhase } from "@/lib/build-types";

interface NaturalViewProps {
  state: BuildState | null;
  onStart?: () => void;
  isStarting?: boolean;
}

export function NaturalView({ state, onStart, isStarting }: NaturalViewProps) {
  const [subtext, setSubtext] = useState("");
  const [subtextVisible, setSubtextVisible] = useState(true);

  const status = deriveNaturalStatus(state);
  const isIdle = !state && !isStarting;
  const isRunning = state?.status === "running";
  const isComplete = state?.status === "complete";
  const isError = state?.status === "error";

  // Rotate through contextual subtexts
  useEffect(() => {
    const subtexts = getSubtextsForPhase(state);
    let i = 0;
    setSubtext(subtexts[0]);

    if (!isRunning) return;

    const interval = setInterval(() => {
      setSubtextVisible(false);
      setTimeout(() => {
        i = (i + 1) % subtexts.length;
        setSubtext(subtexts[i]);
        setSubtextVisible(true);
      }, 400);
    }, 3500);

    return () => clearInterval(interval);
  }, [state, isRunning]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 px-4">
      {/* Main status */}
      <div className="text-center max-w-md">
        {isIdle ? (
          <>
            <h1 className="text-2xl font-light text-neutral-900 mb-6">
              Generate a new site
            </h1>
            <p className="text-sm text-neutral-500 mb-8">
              Three AI models will create unique interpretations of your personal website based on your recent activity.
            </p>
            <button
              onClick={onStart}
              disabled={isStarting}
              className="px-6 py-2.5 bg-neutral-900 text-white text-sm rounded-full hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStarting ? "Starting..." : "Start Generation"}
            </button>
          </>
        ) : (
          <>
            <p
              className={`text-2xl font-light text-neutral-900 mb-4 ${
                isRunning ? "shimmer" : ""
              }`}
            >
              {status}
            </p>
            <p
              className={`text-sm text-neutral-500 transition-opacity duration-300 ${
                subtextVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              {subtext}
            </p>
          </>
        )}
      </div>

      {/* Progress dots */}
      {(isRunning || isComplete || isError) && (
        <div className="flex gap-2 mt-10">
          {(["aggregate", "generate", "commit"] as const).map((phase) => (
            <div
              key={phase}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                state?.workflow[phase] === "complete"
                  ? "bg-neutral-900"
                  : state?.workflow[phase] === "running"
                    ? "bg-neutral-400 animate-pulse"
                    : state?.workflow[phase] === "error"
                      ? "bg-red-500"
                      : "bg-neutral-200"
              }`}
            />
          ))}
        </div>
      )}

      {/* Model status during generation */}
      {state?.workflow.generate === "running" && (
        <div className="absolute bottom-8 flex gap-6 text-xs text-neutral-400">
          {Object.entries(state.models).map(([model, data]) => (
            <div key={model} className="flex items-center gap-2">
              <span
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  data.status === "complete"
                    ? "bg-green-500"
                    : data.status === "running"
                      ? "bg-amber-500 animate-pulse"
                      : data.status === "error"
                        ? "bg-red-500"
                        : "bg-neutral-300"
                }`}
              />
              <span>{model.split("-")[0]}</span>
            </div>
          ))}
        </div>
      )}

      {/* Complete state */}
      {isComplete && (
        <div className="mt-8">
          <a
            href="/"
            className="text-sm text-neutral-600 hover:text-neutral-900 underline underline-offset-4 transition-colors"
          >
            View your new site →
          </a>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="mt-8 text-center">
          <p className="text-sm text-red-600 mb-4">
            {state?.error || "Something went wrong"}
          </p>
          <button
            onClick={onStart}
            className="text-sm text-neutral-600 hover:text-neutral-900 underline underline-offset-4 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Shimmer animation styles */}
      <style jsx>{`
        .shimmer {
          background: linear-gradient(
            90deg,
            currentColor 0%,
            currentColor 40%,
            #a3a3a3 50%,
            currentColor 60%,
            currentColor 100%
          );
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0% {
            background-position: 100% 0;
          }
          100% {
            background-position: -100% 0;
          }
        }
      `}</style>
    </div>
  );
}

