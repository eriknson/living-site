/**
 * Save Build Log
 * Processes cursor-agent stream-json output and appends to build history
 */

import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";

const HISTORY_PATH = "builds/history.json";
const FETCH_SUMMARY_PATH = "data/fetch-summary.json";
const MAX_BUILDS = 20;

interface FetchSourceResult {
  name: string;
  status: "success" | "failure" | "skipped";
  error?: string;
  summary?: string;
}

interface FetchSummary {
  timestamp: string;
  sources: FetchSourceResult[];
}

interface StreamEvent {
  type: "system" | "assistant" | "tool_call" | "result";
  subtype?: string;
  model?: string;
  message?: {
    content: Array<{ type: string; text?: string }>;
  };
  tool_call?: Record<string, unknown>;
  result?: string;
  is_error?: boolean;
  duration_ms?: number;
}

interface BuildEntry {
  id: string;
  timestamp: string;
  formatted_timestamp: string;
  status: "success" | "failure";
  duration_ms?: number;
  model?: string;
  agent_output: string;
}

interface BuildHistory {
  builds: BuildEntry[];
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function formatTimestamp(date: Date): string {
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const day = date.getDate();
  const ordinal =
    day === 1 || day === 21 || day === 31
      ? "st"
      : day === 2 || day === 22
        ? "nd"
        : day === 3 || day === 23
          ? "rd"
          : "th";
  const month = date.toLocaleString("en-US", { month: "long" });
  const year = date.getFullYear();

  return `${time}, ${month} ${day}${ordinal}, ${year}`;
}

function formatToolCall(toolCall: Record<string, unknown>): string {
  for (const [key, value] of Object.entries(toolCall)) {
    if (key.endsWith("ToolCall") && value && typeof value === "object") {
      const toolName = key.replace("ToolCall", "");
      const args = (value as Record<string, unknown>).args as Record<string, unknown> | undefined;
      const result = (value as Record<string, unknown>).result as Record<string, unknown> | undefined;
      
      if (args) {
        const path = args.path || args.file_path || "";
        return `[${toolName}] ${path}`;
      }
      if (result) {
        return `[${toolName}] completed`;
      }
    }
  }
  return JSON.stringify(toolCall);
}

function parseStreamJson(rawOutput: string): {
  formatted: string;
  status: "success" | "failure";
  duration_ms?: number;
  model?: string;
} {
  const lines = rawOutput.trim().split("\n");
  const parts: string[] = [];
  let status: "success" | "failure" = "success";
  let duration_ms: number | undefined;
  let model: string | undefined;
  let currentAssistantText = "";

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const event: StreamEvent = JSON.parse(line);

      switch (event.type) {
        case "system":
          if (event.subtype === "init" && event.model) {
            model = event.model;
            parts.push(`=== Build Started ===`);
            parts.push(`Model: ${event.model}`);
            parts.push("");
          }
          break;

        case "assistant":
          if (event.message?.content) {
            for (const block of event.message.content) {
              if (block.type === "text" && block.text) {
                currentAssistantText += block.text;
              }
            }
          }
          break;

        case "tool_call":
          if (currentAssistantText.trim()) {
            parts.push("--- Agent ---");
            parts.push(currentAssistantText.trim());
            parts.push("");
            currentAssistantText = "";
          }

          if (event.subtype === "started" && event.tool_call) {
            parts.push(`> ${formatToolCall(event.tool_call)}`);
          } else if (event.subtype === "completed" && event.tool_call) {
            for (const [, value] of Object.entries(event.tool_call)) {
              if (value && typeof value === "object") {
                const result = (value as Record<string, unknown>).result;
                if (result && typeof result === "object" && (result as Record<string, unknown>).error) {
                  parts.push(`  Error: ${JSON.stringify((result as Record<string, unknown>).error)}`);
                }
              }
            }
          }
          break;

        case "result":
          if (currentAssistantText.trim()) {
            parts.push("--- Agent ---");
            parts.push(currentAssistantText.trim());
            parts.push("");
            currentAssistantText = "";
          }

          parts.push("");
          parts.push("=== Build Complete ===");
          
          if (event.duration_ms) {
            duration_ms = event.duration_ms;
            parts.push(`Duration: ${(event.duration_ms / 1000).toFixed(1)}s`);
          }
          
          if (event.is_error) {
            status = "failure";
            parts.push(`Status: FAILED`);
            if (event.result) {
              parts.push(`Error: ${event.result}`);
            }
          } else {
            parts.push(`Status: SUCCESS`);
          }
          break;
      }
    } catch {
      if (line.trim() && !line.includes("Build output captured")) {
        parts.push(line);
      }
    }
  }

  if (currentAssistantText.trim()) {
    parts.push("--- Agent ---");
    parts.push(currentAssistantText.trim());
  }

  return {
    formatted: parts.join("\n"),
    status,
    duration_ms,
    model,
  };
}

async function loadHistory(): Promise<BuildHistory> {
  if (!existsSync(HISTORY_PATH)) {
    return { builds: [] };
  }
  try {
    const content = await readFile(HISTORY_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    return { builds: [] };
  }
}

async function loadAndFormatFetchSummary(): Promise<string | null> {
  if (!existsSync(FETCH_SUMMARY_PATH)) {
    return null;
  }
  
  try {
    const content = await readFile(FETCH_SUMMARY_PATH, "utf-8");
    const summary: FetchSummary = JSON.parse(content);
    
    const fetchDate = new Date(summary.timestamp);
    const parts: string[] = [
      "=== Data Fetch ===",
      `Fetched at ${formatTimestamp(fetchDate)}`,
      "",
    ];
    
    for (const source of summary.sources) {
      parts.push(`[${source.name}] ${source.status}`);
      if (source.summary) {
        parts.push(`  ${source.summary}`);
      }
      if (source.error) {
        parts.push(`  Error: ${source.error}`);
      }
      parts.push("");
    }
    
    return parts.join("\n");
  } catch {
    return null;
  }
}

async function saveBuildLog(outputPath: string): Promise<void> {
  let rawOutput: string;
  try {
    rawOutput = await readFile(outputPath, "utf-8");
  } catch (err) {
    console.error(`Failed to read build output from ${outputPath}:`, err);
    rawOutput = "Failed to capture build output";
  }

  const { formatted, status, duration_ms, model } = parseStreamJson(rawOutput);
  const finalStatus = existsSync("generated/index.html") ? "success" : status;

  // Load fetch summary and prepend to output
  const fetchSummary = await loadAndFormatFetchSummary();
  const fullOutput = fetchSummary 
    ? `${fetchSummary}${formatted || rawOutput}`
    : (formatted || rawOutput);

  const now = new Date();
  const entry: BuildEntry = {
    id: generateId(),
    timestamp: now.toISOString(),
    formatted_timestamp: formatTimestamp(now),
    status: finalStatus,
    duration_ms,
    model,
    agent_output: fullOutput,
  };

  const history = await loadHistory();
  history.builds.unshift(entry);

  if (history.builds.length > MAX_BUILDS) {
    history.builds = history.builds.slice(0, MAX_BUILDS);
  }

  await writeFile(HISTORY_PATH, JSON.stringify(history, null, 2));
  console.log(`Build log saved: ${entry.id} (${entry.status})`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const outputPath = process.argv[2];
  if (!outputPath) {
    console.error("Usage: tsx infra/save-build-log.ts <output-file>");
    process.exit(1);
  }

  saveBuildLog(outputPath)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Error:", err.message);
      process.exit(1);
    });
}

export { saveBuildLog };
