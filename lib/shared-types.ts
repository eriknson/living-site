/**
 * Shared Types
 * Common types used across infra scripts and the web app
 */

// =============================================================================
// Fetch Summary Types (used by aggregator and build logs)
// =============================================================================

export interface FetchSourceResult {
  name: string;
  status: "success" | "failure" | "skipped";
  error?: string;
  summary?: string;
}

export interface FetchSummary {
  timestamp: string;
  sources: FetchSourceResult[];
}

// =============================================================================
// Stream Event Types (used by build streaming)
// =============================================================================

export interface StreamEvent {
  type: "system" | "assistant" | "tool_call" | "result";
  subtype?: "init" | "started" | "completed";
  model?: string;
  message?: {
    content: Array<{ type: string; text?: string }>;
  };
  tool_call?: {
    readToolCall?: {
      args: { path: string };
      result?: { success?: { totalLines: number } };
    };
    writeToolCall?: {
      args: { path: string };
      result?: { success?: { linesCreated: number; fileSize: number } };
    };
  };
  duration_ms?: number;
  is_error?: boolean;
  result?: string;
}

