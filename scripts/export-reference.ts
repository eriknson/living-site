/**
 * Export the main page as static HTML for local development
 * 
 * Fetches the rendered page from the production site and saves it
 * to fly-context/reference.html (same location used by the CI workflow).
 * 
 * Usage: npm run export-reference
 */

import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const SITE_URL = process.env.SITE_URL || "https://eriks.design";
const OUTPUT_PATH = join(process.cwd(), "fly-context", "reference.html");

async function exportReference() {
  console.log(`Fetching reference page from ${SITE_URL}?reference=true...`);

  try {
    const response = await fetch(`${SITE_URL}?reference=true`, {
      headers: {
        "User-Agent": "living-site-generator",
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    // Ensure fly-context directory exists
    mkdirSync(join(process.cwd(), "fly-context"), { recursive: true });

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
