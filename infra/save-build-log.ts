/**
 * Save Build Log
 * Processes cursor-agent JSON output and appends to build history
 */

import { readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";

const HISTORY_PATH = "builds/history.json";
const MAX_BUILDS = 20;

interface BuildEntry {
  id: string;
  timestamp: string;
  formatted_timestamp: string;
  status: "success" | "failure";
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

async function saveBuildLog(outputPath: string): Promise<void> {
  // Read the cursor-agent output
  let rawOutput: string;
  try {
    rawOutput = await readFile(outputPath, "utf-8");
  } catch (err) {
    console.error(`Failed to read build output from ${outputPath}:`, err);
    rawOutput = "Failed to capture build output";
  }

  // Try to parse as JSON, fall back to raw text
  let agentOutput: string;
  let status: "success" | "failure" = "success";

  try {
    const json = JSON.parse(rawOutput);
    // Extract the text response from JSON format
    agentOutput = json.response || json.text || json.output || JSON.stringify(json, null, 2);
    status = json.error ? "failure" : "success";
  } catch {
    // Not JSON, use raw output
    agentOutput = rawOutput;
    // Check for common error indicators
    if (rawOutput.toLowerCase().includes("error") || rawOutput.toLowerCase().includes("failed")) {
      status = "failure";
    }
  }

  // Check if generated/index.html exists and was recently modified as success indicator
  if (existsSync("generated/index.html")) {
    status = "success";
  }

  const now = new Date();
  const entry: BuildEntry = {
    id: generateId(),
    timestamp: now.toISOString(),
    formatted_timestamp: formatTimestamp(now),
    status,
    agent_output: agentOutput,
  };

  // Load existing history and append
  const history = await loadHistory();
  history.builds.unshift(entry); // Add to beginning (newest first)

  // Trim to max builds
  if (history.builds.length > MAX_BUILDS) {
    history.builds = history.builds.slice(0, MAX_BUILDS);
  }

  // Save
  await writeFile(HISTORY_PATH, JSON.stringify(history, null, 2));
  console.log(`Build log saved: ${entry.id} (${entry.status})`);
}

// CLI runner
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
