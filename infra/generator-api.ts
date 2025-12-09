/**
 * Generator (API version)
 * Uses Anthropic Claude API for site generation in CI/CD
 */

import { readFile, writeFile, copyFile } from "fs/promises";
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

async function buildPrompt(): Promise<{ system: string; user: string }> {
  const systemPrompt = await readFile(SYSTEM_PROMPT_PATH, "utf-8");
  const data = await readFile(DATA_PATH, "utf-8");

  return {
    system: systemPrompt,
    user: `Here is the current data:\n\n\`\`\`json\n${data}\n\`\`\`\n\nRegenerate the site. Output ONLY the complete HTML file, nothing else.`,
  };
}

async function callAnthropicAPI(
  system: string,
  user: string
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not set");
    return null;
  }

  console.log("Calling Anthropic API...");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Anthropic API error:", response.status, error);
    return null;
  }

  const result = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
  };
  const text = result.content[0]?.text;

  if (!text) {
    console.error("No text in response");
    return null;
  }

  // Extract HTML from response (in case it's wrapped in markdown code blocks)
  const htmlMatch = text.match(/<!DOCTYPE html>[\s\S]*<\/html>/i);
  return htmlMatch ? htmlMatch[0] : text;
}

async function restoreBackup(): Promise<void> {
  if (existsSync(BACKUP_PATH)) {
    await copyFile(BACKUP_PATH, OUTPUT_PATH);
    console.log("Restored previous build from backup");
  }
}

export async function generate(): Promise<boolean> {
  await backupCurrentBuild();

  const { system, user } = await buildPrompt();

  console.log("Generating site...");

  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`Attempt ${attempt}/3...`);

    const html = await callAnthropicAPI(system, user);

    if (html && html.includes("<!DOCTYPE html>")) {
      await writeFile(OUTPUT_PATH, html);
      console.log(`Generated ${OUTPUT_PATH}`);
      return true;
    }

    if (attempt < 3) {
      console.log("Retrying in 5 seconds...");
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  console.error("All generation attempts failed");
  await restoreBackup();
  return false;
}

// CLI runner
if (import.meta.url === `file://${process.argv[1]}`) {
  generate()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((err) => {
      console.error("Error:", err.message);
      process.exit(1);
    });
}

