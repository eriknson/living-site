/**
 * Save Build Log
 * Processes cursor-agent stream-json output, saves HTML to date folders,
 * and updates both history.json (logs) and manifest.json (build index)
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";

const HISTORY_PATH = "public/builds/history.json";
const MANIFEST_PATH = "public/builds/manifest.json";
const FETCH_SUMMARY_PATH = "data/fetch-summary.json";
const SYSTEM_PROMPT_PATH = "infra/prompts/system.md";
const MAX_BUILDS = 50;
const MAX_DATES = 14;
const DEFAULT_MODEL = "opus-4.6-thinking";
const DEFAULT_MODELS = [
  "composer-1.5",
  "opus-4.6-thinking",
  "gpt-5.3-codex-xhigh",
  "gemini-3.1-pro",
];

function injectScrollGuard(html: string): string {
  // Idempotent: don't inject twice.
  if (html.includes('id="__living_site_scroll_guard"')) return html;

  const guardCss = [
    "",
    '<style id="__living_site_scroll_guard">',
    "  /* Scroll guard injected at build time to ensure generated pages remain scrollable in iframes. */",
    "  html, body {",
    "    height: auto !important;",
    "    min-height: 100% !important;",
    "    max-height: none !important;",
    "    overflow-y: auto !important;",
    "    overflow-x: hidden !important;",
    "    position: static !important;",
    "    -webkit-overflow-scrolling: touch !important;",
    "    touch-action: pan-y !important;",
    "    overscroll-behavior-y: contain !important;",
    "  }",
    "  /* Avoid accidental fixed full-screen traps that break scrolling on mobile. */",
    "  body {",
    "    inset: auto !important;",
    "  }",
    "</style>",
    "",
  ].join("\n");

  // Prefer injecting before </head> so it wins by being last in head.
  const headCloseIdx = html.toLowerCase().lastIndexOf("</head>");
  if (headCloseIdx !== -1) {
    return html.slice(0, headCloseIdx) + guardCss + html.slice(headCloseIdx);
  }

  // Fallback: if there's no </head>, inject right after <html ...> or at top.
  const htmlTagMatch = html.match(/<html[^>]*>/i);
  if (htmlTagMatch && htmlTagMatch.index !== undefined) {
    const insertAt = htmlTagMatch.index + htmlTagMatch[0].length;
    return html.slice(0, insertAt) + "\n<head>" + guardCss + "</head>\n" + html.slice(insertAt);
  }

  return guardCss + html;
}

// Each model has its own sandbox file
function getGeneratedPath(model: string): string {
  return `generated/${model}.html`;
}

import type { FetchSourceResult, FetchSummary, StreamEvent } from "../lib/shared-types.js";

interface BuildEntry {
  id: string;
  timestamp: string;
  formatted_timestamp: string;
  status: "success" | "failure";
  duration_ms?: number;
  model?: string;
  agent_output: string;
  token_count?: number;
  line_count?: number;
  github_run_url?: string;
}

interface BuildHistory {
  builds: BuildEntry[];
}

interface ManifestBuild {
  model: string;
  status: "success" | "failure";
  duration_ms?: number;
  line_count?: number;
  path: string;
}

interface ManifestBatch {
  timestamp: string; // ISO timestamp, used as unique identifier
  github_run_url?: string;
  system_prompt?: string; // The system prompt used for this build batch
  builds: ManifestBuild[];
}

interface ManifestDate {
  date: string;
  batches: ManifestBatch[];
}

interface Manifest {
  default_model: string;
  models: string[];
  latest_date: string | null;
  latest_timestamp: string | null; // ISO timestamp of the most recent batch
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
  token_count?: number;
} {
  const lines = rawOutput.trim().split("\n");
  const parts: string[] = [];
  let status: "success" | "failure" = "success";
  let duration_ms: number | undefined;
  let model: string | undefined;
  let token_count: number | undefined;
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

          // Extract token count from usage data if available
          const usage = (event as unknown as Record<string, unknown>).usage as { total_tokens?: number } | undefined;
          if (usage?.total_tokens) {
            token_count = usage.total_tokens;
            parts.push(`Tokens: ${token_count.toLocaleString()}`);
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
    token_count,
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
      default_model: DEFAULT_MODEL,
      models: DEFAULT_MODELS,
      latest_date: null,
      latest_timestamp: null,
      dates: [],
    };
  }
  try {
    const content = await readFile(MANIFEST_PATH, "utf-8");
    return JSON.parse(content);
  } catch {
    return {
      default_model: DEFAULT_MODEL,
      models: DEFAULT_MODELS,
      latest_date: null,
      latest_timestamp: null,
      dates: [],
    };
  }
}

async function loadSystemPrompt(): Promise<string | null> {
  if (!existsSync(SYSTEM_PROMPT_PATH)) {
    return null;
  }
  try {
    return await readFile(SYSTEM_PROMPT_PATH, "utf-8");
  } catch {
    return null;
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

interface ParsedArgs {
  outputPath: string;
  model: string | null;
  date: string | null;
  batchTimestamp: string | null;
  skipHtmlCopy: boolean;
  githubRunUrl: string | null;
}

function parseArgs(args: string[]): ParsedArgs {
  let outputPath = "";
  let model: string | null = null;
  let date: string | null = null;
  let batchTimestamp: string | null = null;
  let skipHtmlCopy = false;
  let githubRunUrl: string | null = null;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--model" && args[i + 1]) {
      model = args[i + 1];
      i++;
    } else if (args[i] === "--date" && args[i + 1]) {
      date = args[i + 1];
      i++;
    } else if (args[i] === "--batch-timestamp" && args[i + 1]) {
      batchTimestamp = args[i + 1];
      i++;
    } else if (args[i] === "--skip-html-copy") {
      skipHtmlCopy = true;
    } else if (args[i] === "--github-run-url" && args[i + 1]) {
      githubRunUrl = args[i + 1];
      i++;
    } else if (!args[i].startsWith("--")) {
      outputPath = args[i];
    }
  }
  
  return { outputPath, model, date, batchTimestamp, skipHtmlCopy, githubRunUrl };
}

interface SaveBuildLogOptions {
  modelOverride?: string | null;
  dateOverride?: string | null;
  batchTimestamp?: string | null;
  skipHtmlCopy?: boolean;
  githubRunUrl?: string | null;
}

async function saveBuildLog(outputPath: string, options: SaveBuildLogOptions = {}): Promise<void> {
  const { modelOverride = null, dateOverride = null, batchTimestamp = null, skipHtmlCopy = false, githubRunUrl = null } = options;
  
  let rawOutput: string;
  try {
    rawOutput = await readFile(outputPath, "utf-8");
  } catch (err) {
    console.error(`Failed to read build output from ${outputPath}:`, err);
    rawOutput = "Failed to capture build output";
  }

  const { formatted, status, duration_ms, model: detectedModel, token_count } = parseStreamJson(rawOutput);
  
  // Use override model if provided, otherwise use detected model
  const model = modelOverride || detectedModel || "unknown";
  
  const now = new Date();
  // Use batch timestamp if provided (for CI to ensure all models in a run share the same timestamp)
  const timestamp = batchTimestamp || now.toISOString();
  const timestampMs = new Date(timestamp).getTime();
  
  // Use date override if provided (useful for CI to ensure consistent date across jobs)
  const dateStr = dateOverride || getDateString(now);
  const dateDir = `public/builds/${dateStr}`;
  
  // New file naming: builds/{date}/{model}-{timestamp}.html
  const buildFileName = `${model}-${timestampMs}.html`;
  const buildPath = `${dateDir}/${buildFileName}`;
  
  // Each model has its own sandbox file: generated/{model}.html
  const generatedPath = getGeneratedPath(model);
  
  // Check if build HTML exists
  const hasGeneratedHtml = existsSync(generatedPath);
  const finalStatus = hasGeneratedHtml ? "success" : status;

  // Load fetch summary and prepend to output
  const fetchSummary = await loadAndFormatFetchSummary();
  const fullOutput = fetchSummary 
    ? `${fetchSummary}${formatted || rawOutput}`
    : (formatted || rawOutput);

  // Calculate line count from generated HTML
  let line_count: number | undefined;
  if (hasGeneratedHtml) {
    try {
      const htmlContent = await readFile(generatedPath, "utf-8");
      line_count = htmlContent.split("\n").length;
    } catch {
      // Ignore if we can't read the file
    }
  }

  // 1. Save to history.json (agent logs)
  const entry: BuildEntry = {
    id: generateId(),
    timestamp,
    formatted_timestamp: formatTimestamp(new Date(timestamp)),
    status: finalStatus,
    duration_ms,
    model,
    agent_output: fullOutput,
    token_count,
    line_count,
    github_run_url: githubRunUrl || undefined,
  };

  const history = await loadHistory();
  history.builds.unshift(entry);

  if (history.builds.length > MAX_BUILDS) {
    history.builds = history.builds.slice(0, MAX_BUILDS);
  }

  await writeFile(HISTORY_PATH, JSON.stringify(history, null, 2));
  console.log(`Build log saved: ${entry.id} (${finalStatus})`);

  // 2. Save HTML to builds/{date}/{model}-{timestamp}.html
  // Skip if --skip-html-copy is set (useful in CI where HTML is already copied by workflow)
  if (!skipHtmlCopy && hasGeneratedHtml) {
    if (!existsSync(dateDir)) {
      await mkdir(dateDir, { recursive: true });
    }

    // Inject scroll guard to ensure the archived HTML is always scrollable when embedded.
    const rawHtml = await readFile(generatedPath, "utf-8");
    const wrappedHtml = injectScrollGuard(rawHtml);
    await writeFile(buildPath, wrappedHtml, "utf-8");
    console.log(`Build HTML saved: ${buildPath} (from ${generatedPath})`);
  } else if (skipHtmlCopy) {
    console.log(`Skipping HTML copy (--skip-html-copy flag set)`);
  }

  // 3. Update manifest.json (if build was successful)
  if (finalStatus === "success") {
    const manifest = await loadManifest();

    // Keep manifest models aligned with active CI models while preserving historical ones.
    const existingModels = Array.isArray(manifest.models) ? manifest.models : [];
    const mergedModels = [...DEFAULT_MODELS, ...existingModels, model];
    manifest.models = Array.from(new Set(mergedModels));
    if (!manifest.default_model || !manifest.models.includes(manifest.default_model)) {
      manifest.default_model = DEFAULT_MODEL;
    }
    
    // Find or create the date entry
    let dateEntry = manifest.dates.find(d => d.date === dateStr);
    if (!dateEntry) {
      dateEntry = { date: dateStr, batches: [] };
      manifest.dates.unshift(dateEntry);
    }
    
    // Find or create the batch for this timestamp
    let batch = dateEntry.batches.find(b => b.timestamp === timestamp);
    if (!batch) {
      // Load system prompt for new batches
      const systemPrompt = await loadSystemPrompt();
      batch = { 
        timestamp, 
        github_run_url: githubRunUrl || undefined, 
        system_prompt: systemPrompt || undefined,
        builds: [] 
      };
      // Insert at beginning (most recent first)
      dateEntry.batches.unshift(batch);
    } else {
      // Update github_run_url if not set
      if (githubRunUrl && !batch.github_run_url) {
        batch.github_run_url = githubRunUrl;
      }
      // Update system_prompt if not set (in case first model didn't have it)
      if (!batch.system_prompt) {
        const systemPrompt = await loadSystemPrompt();
        if (systemPrompt) {
          batch.system_prompt = systemPrompt;
        }
      }
    }
    
    // Add or update the build for this model in this batch
    const existingBuildIdx = batch.builds.findIndex(b => b.model === model);
    // Path for manifest should be relative to public/ (Next.js serves public/ at root)
    const manifestPath = `builds/${dateStr}/${buildFileName}`;
    const buildInfo: ManifestBuild = {
      model,
      status: finalStatus,
      duration_ms,
      line_count,
      path: manifestPath,
    };
    
    if (existingBuildIdx >= 0) {
      batch.builds[existingBuildIdx] = buildInfo;
    } else {
      batch.builds.push(buildInfo);
    }
    
    // Update latest date and timestamp
    manifest.latest_date = dateStr;
    manifest.latest_timestamp = timestamp;
    
    // Trim old dates
    if (manifest.dates.length > MAX_DATES) {
      manifest.dates = manifest.dates.slice(0, MAX_DATES);
    }
    
    await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    console.log(`Manifest updated: ${model} for ${dateStr} (batch ${timestamp})`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { outputPath, model, date, batchTimestamp, skipHtmlCopy, githubRunUrl } = parseArgs(process.argv.slice(2));
  
  if (!outputPath) {
    console.error("Usage: tsx infra/save-build-log.ts <output-file> [--model <model-name>] [--date <YYYY-MM-DD>] [--batch-timestamp <ISO-timestamp>] [--skip-html-copy] [--github-run-url <url>]");
    process.exit(1);
  }

  saveBuildLog(outputPath, { modelOverride: model, dateOverride: date, batchTimestamp, skipHtmlCopy, githubRunUrl })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Error:", err.message);
      process.exit(1);
    });
}

export { saveBuildLog };
