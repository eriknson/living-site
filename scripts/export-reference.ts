/**
 * Export the main page as static HTML for agents to read
 * 
 * This script fetches the rendered page from the production site
 * and saves it as public/reference.html
 * 
 * Usage: npm run export-reference
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const SITE_URL = process.env.SITE_URL || "https://eriks.design";
const OUTPUT_PATH = join(process.cwd(), "infra", "prompts", "reference.html");

async function exportReference() {
  console.log(`Fetching reference page from ${SITE_URL}...`);

  try {
    const response = await fetch(SITE_URL, {
      headers: {
        "User-Agent": "ReferenceExporter/1.0",
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    // Ensure infra/prompts directory exists
    mkdirSync(join(process.cwd(), "infra", "prompts"), { recursive: true });

    // Write the HTML file
    writeFileSync(OUTPUT_PATH, html, "utf-8");

    console.log(`✓ Exported reference.html (${html.length} bytes)`);
    console.log(`  Saved to: ${OUTPUT_PATH}`);
  } catch (error) {
    console.error("Failed to export reference:", error);
    process.exit(1);
  }
}

exportReference();

