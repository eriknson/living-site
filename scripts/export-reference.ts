/**
 * Export the main page as styled HTML for curator processing
 * 
 * Fetches the rendered page from the production site and saves it
 * to data/styled-page.html. The curator agent then converts this
 * to semantic HTML at data/reference.html.
 * 
 * Usage: npm run export-reference
 */

import { writeFileSync } from "fs";
import { join } from "path";

const SITE_URL = process.env.SITE_URL || "https://eriks.design";
const OUTPUT_PATH = join(process.cwd(), "data", "styled-page.html");

async function exportReference() {
  console.log(`Fetching styled page from ${SITE_URL}...`);

  try {
    const response = await fetch(SITE_URL, {
      headers: {
        "User-Agent": "living-site-generator",
        Accept: "text/html",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    // Write the HTML file
    writeFileSync(OUTPUT_PATH, html, "utf-8");

    console.log(`✓ Exported styled-page.html (${html.length} bytes)`);
    console.log(`  Saved to: ${OUTPUT_PATH}`);
    console.log(`  Run 'npm run curator' to generate semantic reference.html`);
  } catch (error) {
    console.error("Failed to export:", error);
    process.exit(1);
  }
}

exportReference();
