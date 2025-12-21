/**
 * Extract the last git commit date of app/page.tsx
 * 
 * This script gets the last modification date of the manual homepage
 * and writes it to data/manual-version.json for display in the menu bar.
 * 
 * Usage: npx tsx scripts/extract-manual-version-date.ts
 */

import { execFileSync } from "child_process";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const TARGET_FILE = "app/page.tsx";
const OUTPUT_PATH = join(process.cwd(), "data", "manual-version.json");

function extractManualVersionDate() {
  console.log(`Extracting last update date for ${TARGET_FILE}...`);

  try {
    // Get the last commit date for app/page.tsx
    const gitOutput = execFileSync("git", [
      "log",
      "-1",
      "--format=%cI",  // ISO 8601 format
      "--",
      TARGET_FILE,
    ], { encoding: "utf-8" }).trim();

    if (!gitOutput) {
      console.warn(`Warning: No git history found for ${TARGET_FILE}`);
      // Fall back to current date if no git history
      const fallbackDate = new Date().toISOString();
      writeOutput({ lastUpdated: fallbackDate, source: "fallback" });
      return;
    }

    const lastUpdated = gitOutput;
    console.log(`✓ Last updated: ${lastUpdated}`);

    writeOutput({ lastUpdated, source: "git" });
  } catch (error) {
    console.error("Failed to extract manual version date:", error);
    // Don't fail the build, just use current date as fallback
    const fallbackDate = new Date().toISOString();
    writeOutput({ lastUpdated: fallbackDate, source: "fallback" });
  }
}

function writeOutput(data: { lastUpdated: string; source: string }) {
  // Ensure data directory exists
  mkdirSync(join(process.cwd(), "data"), { recursive: true });

  writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
  console.log(`✓ Written to ${OUTPUT_PATH}`);
}

extractManualVersionDate();
