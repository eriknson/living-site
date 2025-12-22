/**
 * Export minimal context for the fly agent
 * 
 * Creates an isolated workspace with only:
 * - brief.json (curator output)
 * - identity.json (basic info)
 * - reference.html (main page as static HTML)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const OUTPUT_DIR = "fly-context";
const DATA_DIR = "data";

// Ensure output directory exists
mkdirSync(OUTPUT_DIR, { recursive: true });

console.log("Exporting context for fly agent...\n");

// 1. Copy brief.json (curator output - mood, narrative, current projects)
try {
  const brief = readFileSync(join(DATA_DIR, "brief.json"), "utf-8");
  writeFileSync(join(OUTPUT_DIR, "brief.json"), brief);
  console.log("✓ brief.json");
} catch (e) {
  console.error("✗ brief.json not found, creating placeholder");
  writeFileSync(
    join(OUTPUT_DIR, "brief.json"),
    JSON.stringify(
      {
        mood: "focused",
        intro: "Building tools and exploring ideas.",
        currently: [],
        listening: "",
        footer: "Stockholm",
        weather_note: "",
      },
      null,
      2
    )
  );
}

// 2. Copy identity.json (name, socials, location)
try {
  const identity = readFileSync(join(DATA_DIR, "identity.json"), "utf-8");
  writeFileSync(join(OUTPUT_DIR, "identity.json"), identity);
  console.log("✓ identity.json");
} catch (e) {
  console.error("✗ identity.json not found, creating placeholder");
  writeFileSync(
    join(OUTPUT_DIR, "identity.json"),
    JSON.stringify(
      {
        name: "Erik",
        location: "Stockholm, Sweden",
        email: "contact@eriks.design",
        twitter: "flowstated",
        linkedin: "eriknson",
        github: "eriknson",
      },
      null,
      2
    )
  );
}

// 3. Copy about.json (headline, bio)
try {
  const about = readFileSync(join(DATA_DIR, "about.json"), "utf-8");
  writeFileSync(join(OUTPUT_DIR, "about.json"), about);
  console.log("✓ about.json");
} catch (e) {
  console.error("✗ about.json not found, creating placeholder");
  writeFileSync(
    join(OUTPUT_DIR, "about.json"),
    JSON.stringify(
      {
        headline: "Product designer building with AI",
        bio: "Believing in simplicity and iterating until every detail feels great.",
      },
      null,
      2
    )
  );
}

// 4. Create reference.html - the main eriks.design page as clean static HTML
// This serves as a design reference for the agent
const referenceHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>eriks.design - Reference</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
      background: #fafaf9;
      color: #1a1a1a;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }
    @media (prefers-color-scheme: dark) {
      body { background: #0a0a0a; color: #e5e5e5; }
    }
    main {
      max-width: 580px;
      margin: 0 auto;
      padding: 64px 24px;
    }
    h1 {
      font-size: 28px;
      font-weight: 600;
      margin-bottom: 24px;
      color: rgba(0,0,0,0.9);
    }
    @media (prefers-color-scheme: dark) {
      h1 { color: rgba(255,255,255,0.9); }
    }
    .bio {
      font-size: 17px;
      color: rgba(0,0,0,0.7);
      margin-bottom: 40px;
    }
    .bio p { margin-bottom: 20px; }
    @media (prefers-color-scheme: dark) {
      .bio { color: rgba(255,255,255,0.7); }
    }
    a {
      color: inherit;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    footer {
      font-size: 13px;
      color: rgba(0,0,0,0.3);
      padding: 48px 0;
    }
    @media (prefers-color-scheme: dark) {
      footer { color: rgba(255,255,255,0.3); }
    }
  </style>
</head>
<body>
  <main>
    <h1>Erik</h1>
    <div class="bio">
      <p>
        I'm a product designer building with AI. I believe in simplicity and
        iterating until every detail feels right. Based in Stockholm, Sweden.
      </p>
      <p>
        Currently building <a href="https://github.com/eriknson/shipflow">shipflow</a>,
        a point-and-click editing layer for Next.js powered by Cursor Agent.
        Also exploring ways to spin up agents from my phone using iOS Shortcuts,
        GitHub Actions, and the Cursor CLI.
      </p>
      <p>
        I share my work on <a href="https://x.com/flowstated">X</a>,
        push code to <a href="https://github.com/eriknson">GitHub</a>,
        and you can also find me on <a href="https://linkedin.com/in/eriknson">LinkedIn</a>.
        <a href="mailto:contact@eriks.design">Say hello</a> if you want to chat.
      </p>
    </div>
    <footer>© 2025</footer>
  </main>
</body>
</html>`;

writeFileSync(join(OUTPUT_DIR, "reference.html"), referenceHtml);
console.log("✓ reference.html");

// 5. Create a simple README for the agent
const readme = `# eriks.design - Agent Workspace

This is an isolated workspace for generating Erik's personal website.

## Files

- \`context/brief.json\` - Current mood, projects, and narrative from the curator
- \`context/identity.json\` - Basic info (name, socials, location)
- \`context/about.json\` - Headline and bio
- \`context/reference.html\` - The main eriks.design page design

## Output

Write your generated HTML to:
\`\`\`
generated/live.html
\`\`\`

## Requirements

- Single self-contained HTML file with embedded CSS
- Minimal, editorial design
- Support dark mode via prefers-color-scheme
- Include links to Twitter (@flowstated), GitHub (eriknson), LinkedIn
- Reflect the current mood from brief.json
`;

writeFileSync(join(OUTPUT_DIR, "README.md"), readme);
console.log("✓ README.md");

console.log(`\n✓ Context exported to ${OUTPUT_DIR}/`);
console.log("\nFiles created:");
console.log("  - brief.json");
console.log("  - identity.json");
console.log("  - about.json");
console.log("  - reference.html");
console.log("  - README.md");


