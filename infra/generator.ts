/**
 * Generator
 * Calls Cursor CLI with system prompt + aggregated data to regenerate the site
 */

import { readFile, writeFile, copyFile } from "fs/promises";
import { execSync } from "child_process";
import { existsSync } from "fs";

const SYSTEM_PROMPT_PATH = "infra/prompts/system.md";
const DATA_PATH = "data/latest.json";
const OUTPUT_PATH = "generated/index.html";
const BACKUP_PATH = "builds/previous.html";

async function backupCurrentBuild(): Promise<void> {
  if (existsSync(OUTPUT_PATH)) {
    await copyFile(OUTPUT_PATH, BACKUP_PATH);
    console.log("Backed up current build");
  }
}

function formatBuildTimestamp(date: Date): string {
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

async function buildPrompt(): Promise<string> {
  const systemPrompt = await readFile(SYSTEM_PROMPT_PATH, "utf-8");
  const data = await readFile(DATA_PATH, "utf-8");
  const buildTimestamp = formatBuildTimestamp(new Date());

  return `${systemPrompt}

---

## Current Data

\`\`\`json
${data}
\`\`\`

---

**CRITICAL**: The "Updated" timestamp in the header MUST be exactly: "Updated ${buildTimestamp}"

Now regenerate \`generated/index.html\` based on the data above. Output the complete HTML file.`;
}

async function callCursorCLI(prompt: string, retries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    console.log(`Generation attempt ${attempt}/${retries}...`);

    try {
      // Write prompt to temp file for Cursor CLI
      const tempPromptPath = "/tmp/living-site-prompt.md";
      await writeFile(tempPromptPath, prompt);

      // Call Cursor CLI
      // Note: The exact CLI syntax may vary based on Cursor CLI version
      execSync(
        `cursor --prompt-file "${tempPromptPath}" --edit "${OUTPUT_PATH}"`,
        {
          stdio: "inherit",
          timeout: 120000, // 2 minute timeout
        }
      );

      console.log("Generation successful");
      return true;
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      if (attempt === retries) {
        return false;
      }
      // Wait before retry
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
  return false;
}

async function restoreBackup(): Promise<void> {
  if (existsSync(BACKUP_PATH)) {
    await copyFile(BACKUP_PATH, OUTPUT_PATH);
    console.log("Restored previous build from backup");
  }
}

export async function generate(): Promise<boolean> {
  // Backup current build
  await backupCurrentBuild();

  // Build the full prompt
  const prompt = await buildPrompt();

  console.log("Prompt built, calling Cursor CLI...");
  console.log(`Data: ${DATA_PATH}`);
  console.log(`Output: ${OUTPUT_PATH}`);

  // Call Cursor CLI
  const success = await callCursorCLI(prompt);

  if (!success) {
    console.error("All generation attempts failed");
    await restoreBackup();
    return false;
  }

  return true;
}

// For testing without Cursor CLI - just outputs the prompt
export async function dryRun(): Promise<void> {
  const prompt = await buildPrompt();
  console.log("=== DRY RUN - PROMPT PREVIEW ===\n");
  console.log(prompt);
  console.log("\n=== END PROMPT ===");
}

// CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
  const isDryRun = process.argv.includes("--dry-run");

  if (isDryRun) {
    dryRun().catch((err) => {
      console.error("Error:", err.message);
      process.exit(1);
    });
  } else {
    generate()
      .then((success) => {
        process.exit(success ? 0 : 1);
      })
      .catch((err) => {
        console.error("Error:", err.message);
        process.exit(1);
      });
  }
}

