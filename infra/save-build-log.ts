/**
 * Save Build Log
 * Processes cursor-agent stream-json output, saves HTML to date folders,
 * and updates both history.json (logs) and manifest.json (build index)
 */

import { readFile, writeFile, mkdir, copyFile } from "fs/promises";
import { existsSync } from "fs";

const HISTORY_PATH = "public/builds/history.json";
const MANIFEST_PATH = "public/builds/manifest.json";
const FETCH_SUMMARY_PATH = "data/fetch-summary.json";
const GENERATED_PATH = "generated/index.html";
const MAX_BUILDS = 50;
const MAX_DATES = 14;

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

interface ManifestBuild {
  model: string;
  status: "success" | "failure";
  duration_ms?: number;
  path: string;
}

interface ManifestDate {
  date: string;
  builds: ManifestBuild[];
}

interface Manifest {
  default_model: string;
  models: string[];
  latest_date: string | null;
  dates: ManifestDate[];
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function getDateString(date: Date): string {
  return date.toISOString().split("T")[0];
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
    const parsed = JSON.parse(content);
    // Handle both { builds: [] } and plain [] formats
    if (Array.isArray(parsed)) {
      return { builds: parsed };
    }
    return parsed.builds ? parsed : { builds: [] };
  } catch {
    return { builds: [] };
  }
}

async function loadManifest(): Promise<Manifest> {
  if (!existsSync(MANIFEST_PATH)) {
    return {
      default_model: "composer-1",
      models: ["composer-1", "claude-4.5-opus-high-thinking", "gpt-5.1-codex"],
      latest_date: null,
      dates: [],
    };
  }
  try {
    const content = await readFile(MANIFEST_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    return {
      default_model: "composer-1",
      models: ["composer-1", "claude-4.5-opus-high-thinking", "gpt-5.1-codex"],
      latest_date: null,
      dates: [],
    };
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

function parseArgs(args: string[]): { outputPath: string; model: string | null } {
  let outputPath = "";
  let model: string | null = null;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--model" && args[i + 1]) {
      model = args[i + 1];
      i++;
    } else if (!args[i].startsWith("--")) {
      outputPath = args[i];
    }
  }
  
  return { outputPath, model };
}

async function saveBuildLog(outputPath: string, modelOverride: string | null): Promise<void> {
  let rawOutput: string;
  try {
    rawOutput = await readFile(outputPath, "utf-8");
  } catch (err) {
    console.error(`Failed to read build output from ${outputPath}:`, err);
    rawOutput = "Failed to capture build output";
  }

  const { formatted, status, duration_ms, model: detectedModel } = parseStreamJson(rawOutput);
  
  // Use override model if provided, otherwise use detected model
  const model = modelOverride || detectedModel || "unknown";
  
  const now = new Date();
  const dateStr = getDateString(now);
  const dateDir = `public/builds/${dateStr}`;
  const buildPath = `${dateDir}/${model}.html`;
  
  // Check if build HTML exists (either from generated/ or already in builds/)
  const hasGeneratedHtml = existsSync(GENERATED_PATH);
  const hasBuildHtml = existsSync(buildPath);
  const finalStatus = (hasGeneratedHtml || hasBuildHtml) ? "success" : status;

  // Load fetch summary and prepend to output
  const fetchSummary = await loadAndFormatFetchSummary();
  const fullOutput = fetchSummary 
    ? `${fetchSummary}${formatted || rawOutput}`
    : (formatted || rawOutput);

  // 1. Save to history.json (agent logs - backward compatible)
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
  console.log(`Build log saved: ${entry.id} (${finalStatus})`);

  // 2. Save HTML to builds/{date}/{model}.html (if from generated/ and not already there)
  if (hasGeneratedHtml && !hasBuildHtml) {
    if (!existsSync(dateDir)) {
      await mkdir(dateDir, { recursive: true });
    }
    
    await copyFile(GENERATED_PATH, buildPath);
    console.log(`Build HTML saved: ${buildPath}`);
  }

  // 3. Update manifest.json (if build was successful)
  if (finalStatus === "success") {
    const manifest = await loadManifest();
    
    // Find or create the date entry
    let dateEntry = manifest.dates.find(d => d.date === dateStr);
    if (!dateEntry) {
      dateEntry = { date: dateStr, builds: [] };
      manifest.dates.unshift(dateEntry);
    }
    
    // Update or add the build for this model
    const existingBuildIdx = dateEntry.builds.findIndex(b => b.model === model);
    // Path for manifest should be relative to public/ (Next.js serves public/ at root)
    const manifestPath = `builds/${dateStr}/${model}.html`;
    const buildInfo: ManifestBuild = {
      model,
      status: finalStatus,
      duration_ms,
      path: manifestPath,
    };
    
    if (existingBuildIdx >= 0) {
      dateEntry.builds[existingBuildIdx] = buildInfo;
    } else {
      dateEntry.builds.push(buildInfo);
    }
    
    // Update latest date
    manifest.latest_date = dateStr;
    
    // Trim old dates
    if (manifest.dates.length > MAX_DATES) {
      manifest.dates = manifest.dates.slice(0, MAX_DATES);
    }
    
    await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log(`Manifest updated: ${model} for ${dateStr}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { outputPath, model } = parseArgs(process.argv.slice(2));
  
  if (!outputPath) {
    console.error("Usage: tsx infra/save-build-log.ts <output-file> [--model <model-name>]");
    process.exit(1);
  }

  saveBuildLog(outputPath, model)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Error:", err.message);
      process.exit(1);
    });
}

export { saveBuildLog };
