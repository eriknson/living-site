/**
 * Build Types
 * Shared types for real-time build streaming between GHA and browser
 */

// Re-export StreamEvent from shared types
export type { StreamEvent } from "./shared-types";
import type { StreamEvent } from "./shared-types";

// Workflow phase status
export type PhaseStatus = "pending" | "running" | "complete" | "error";

// Model build status
export type ModelStatus = "queued" | "running" | "complete" | "error";

// Current activity phase for a model
export type ActivityPhase =
  | "initializing"
  | "reading"
  | "thinking"
  | "writing"
  | "complete"
  | "error";

// Progress for a single model
export interface ModelProgress {
  status: ModelStatus;
  phase?: ActivityPhase;
  detail?: string; // Current file being read/written, or thought snippet
  duration?: number;
  lineCount?: number;
  rawLog: string[]; // Raw terminal output lines
}

// Overall build state stored in KV
export interface BuildState {
  id: string;
  status: "running" | "complete" | "error";
  startedAt: string;
  completedAt?: string;
  workflow: {
    aggregate: PhaseStatus;
    generate: PhaseStatus;
    commit: PhaseStatus;
  };
  models: Record<string, ModelProgress>;
  aggregateLog: string[]; // Raw log for aggregate phase
  error?: string;
}

// Event sent from GHA to webhook
export interface BuildEvent {
  buildId: string;
  event:
    | "aggregate.started"
    | "aggregate.log"
    | "aggregate.complete"
    | "aggregate.error"
    | "model.started"
    | "model.stream"
    | "model.complete"
    | "model.error"
    | "commit.started"
    | "commit.complete"
    | "commit.error"
    | "build.complete"
    | "build.error";
  model?: string;
  data?: StreamEvent | string;
  timestamp?: string;
}

// SSE message sent to browser
export interface SSEMessage {
  type: "state" | "event" | "error" | "done";
  data: BuildState | BuildEvent | string;
}

// Natural language phrases for different phases
const aggregatePhrases = [
  "Gathering your data...",
  "Checking what you've been up to...",
  "Reading through your activity...",
];

const thinkingPhrases = [
  "Thinking...",
  "Planning the layout...",
  "Considering the aesthetic...",
  "Finding the right vibe...",
];

const writingPhrases = [
  "Building your website...",
  "Writing the code...",
  "Putting it all together...",
  "Creating something unique...",
];

const commitPhrases = [
  "Almost there...",
  "Saving your new site...",
  "Finishing up...",
];

/**
 * Pick a random phrase from an array
 */
function pickRandom(phrases: string[]): string {
  return phrases[Math.floor(Math.random() * phrases.length)];
}

/**
 * Derive a natural language status message from build state
 */
export function deriveNaturalStatus(state: BuildState | null): string {
  if (!state) return "Starting up...";

  if (state.status === "error") {
    return "Something went wrong...";
  }

  if (state.status === "complete") {
    return "Done.";
  }

  if (state.workflow.aggregate === "running") {
    return pickRandom(aggregatePhrases);
  }

  if (state.workflow.generate === "running") {
    // Check what models are doing
    for (const [, progress] of Object.entries(state.models)) {
      if (progress.status === "running") {
        if (progress.phase === "writing") return pickRandom(writingPhrases);
        if (progress.phase === "thinking") return pickRandom(thinkingPhrases);
        if (progress.phase === "reading") return "Reading the brief...";
      }
    }
    return "Creating...";
  }

  if (state.workflow.commit === "running") {
    return pickRandom(commitPhrases);
  }

  return "Thinking...";
}

/**
 * Get contextual subtexts for the current phase
 */
export function getSubtextsForPhase(state: BuildState | null): string[] {
  if (!state || state.workflow.aggregate !== "complete") {
    return [
      "Listening to patterns in the noise",
      "Checking your GitHub activity",
      "Seeing what you've been up to",
      "Reading between the commits",
    ];
  }

  if (state.workflow.generate === "running") {
    return [
      "Three minds, three perspectives",
      "Finding the right aesthetic",
      "Translating data into design",
      "Making something that feels like you",
    ];
  }

  if (state.workflow.commit === "running") {
    return ["Saving your new site...", "Deploying to the world..."];
  }

  return ["Your site is ready."];
}

/**
 * Parse a stream event and update model progress
 */
export function parseStreamEvent(
  event: StreamEvent,
  current: ModelProgress
): ModelProgress {
  const updated = { ...current };

  switch (event.type) {
    case "system":
      if (event.subtype === "init") {
        updated.phase = "initializing";
        updated.rawLog.push(`=== Model: ${event.model} ===`);
      }
      break;

    case "tool_call":
      if (event.subtype === "started") {
        if (event.tool_call?.readToolCall) {
          const path = event.tool_call.readToolCall.args.path;
          updated.phase = "reading";
          updated.detail = path;
          updated.rawLog.push(`> [read] ${path}`);
        }
        if (event.tool_call?.writeToolCall) {
          const path = event.tool_call.writeToolCall.args.path;
          updated.phase = "writing";
          updated.detail = path;
          updated.rawLog.push(`> [write] ${path}`);
        }
      }
      if (event.subtype === "completed") {
        if (event.tool_call?.readToolCall?.result?.success) {
          const lines = event.tool_call.readToolCall.result.success.totalLines;
          updated.rawLog.push(`  ✓ ${lines} lines`);
        }
        if (event.tool_call?.writeToolCall?.result?.success) {
          const lines =
            event.tool_call.writeToolCall.result.success.linesCreated;
          updated.lineCount = lines;
          updated.rawLog.push(`  ✓ ${lines} lines written`);
        }
      }
      break;

    case "assistant":
      const text =
        event.message?.content
          ?.filter((c) => c.text)
          .map((c) => c.text)
          .join("") || "";
      if (text) {
        updated.phase = "thinking";
        // Store last 100 chars for display
        updated.detail = text.slice(-100);
        // Add to log with "--- Agent ---" prefix if new thought block
        if (
          !updated.rawLog.length ||
          !updated.rawLog[updated.rawLog.length - 1].startsWith("  ")
        ) {
          updated.rawLog.push("--- Agent ---");
        }
        updated.rawLog.push(`  ${text.slice(0, 200)}${text.length > 200 ? "..." : ""}`);
      }
      break;

    case "result":
      if (event.is_error) {
        updated.status = "error";
        updated.phase = "error";
        updated.rawLog.push(`=== ERROR ===`);
        if (event.result) {
          updated.rawLog.push(event.result);
        }
      } else {
        updated.status = "complete";
        updated.phase = "complete";
        updated.duration = event.duration_ms;
        updated.rawLog.push(`=== Complete ===`);
        if (event.duration_ms) {
          updated.rawLog.push(`Duration: ${(event.duration_ms / 1000).toFixed(1)}s`);
        }
      }
      break;
  }

  return updated;
}

/**
 * Create initial build state
 */
export function createInitialBuildState(buildId: string): BuildState {
  return {
    id: buildId,
    status: "running",
    startedAt: new Date().toISOString(),
    workflow: {
      aggregate: "pending",
      generate: "pending",
      commit: "pending",
    },
    models: {
      "composer-1": {
        status: "queued",
        rawLog: [],
      },
      "claude-4.5-opus-high-thinking": {
        status: "queued",
        rawLog: [],
      },
      "gpt-5.1-codex": {
        status: "queued",
        rawLog: [],
      },
      "gemini-3-pro": {
        status: "queued",
        rawLog: [],
      },
    },
    aggregateLog: [],
  };
}

/**
 * Format terminal line with color hints for the UI
 */
export function getLineType(
  line: string
): "read" | "write" | "agent" | "success" | "error" | "default" {
  if (line.startsWith("> [read]")) return "read";
  if (line.startsWith("> [write]")) return "write";
  if (line.startsWith("--- Agent ---")) return "agent";
  if (line.startsWith("✓") || line.includes("Complete")) return "success";
  if (line.startsWith("Error:") || line.includes("ERROR") || line.includes("FAILED")) return "error";
  return "default";
}

