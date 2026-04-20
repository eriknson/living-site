/**
 * me.txt generator — deterministic fallback
 *
 * Reads aggregated data and templates a valid me.txt for Erik.
 * Used for local testing and as CI fallback if cursor-agent fails.
 *
 * Usage: tsx infra/generate-metxt.ts
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";

interface Identity {
  name: string;
  location?: string;
  email: string;
  twitter: string;
  linkedin: string;
  github: string;
}

interface About {
  headline: string;
  bio: string;
  github_context?: string;
}

interface Repo {
  name: string;
  full_name: string;
  description: string | null;
  language: string | null;
  url: string;
  is_owned: boolean;
  recent_commits: number;
}

interface ExternalContribution {
  repo: string;
  type: string;
  created_at: string;
}

interface AggregatedData {
  identity: Identity;
  about: About;
  sources: {
    github?: {
      active_repos?: Repo[];
      external_contributions?: ExternalContribution[];
      languages?: Record<string, number>;
    };
    typefully?: {
      themes?: {
        interests?: string[];
      };
    };
  };
}

const NOISE_LANGUAGES = new Set(["Jupyter Notebook", "Shell", "Makefile", "Dockerfile"]);

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max).replace(/\s+\S*$/, "") + "...";
}

function buildMeTxt(data: AggregatedData): string {
  const { identity, sources } = data;
  const github = sources.github;
  const lines: string[] = [];

  lines.push(`# Erik Nilsson`);
  lines.push(``);
  lines.push(`> Product Designer at Cursor — making tools for building software with AI`);
  lines.push(``);

  // Now — lead with Cursor, side projects framed lightly
  lines.push(`## Now`);
  lines.push(``);
  lines.push(`- Designing [Cursor](https://cursor.com)`);

  const ownedRepos = (github?.active_repos || [])
    .filter((r) => r.is_owned && r.description)
    .slice(0, 2);

  for (const repo of ownedRepos) {
    const short = truncate(
      repo.description!.charAt(0).toLowerCase() + repo.description!.slice(1).replace(/\.$/, ""),
      60
    );
    lines.push(`- Tinkering with [${repo.name}](${repo.url}) — ${short}`);
  }

  const externalRepos = (github?.external_contributions || [])
    .map((c) => c.repo)
    .filter((r, i, arr) => arr.indexOf(r) === i)
    .filter((r) => !r.includes(identity.github + "/"))
    .slice(0, 2);

  if (externalRepos.length > 0) {
    lines.push(`- Contributing to ${externalRepos.map((r) => `[${r.split("/")[1]}](https://github.com/${r})`).join(", ")}`);
  }

  lines.push(``);

  // Skills
  lines.push(`## Skills`);
  lines.push(``);
  lines.push(`- Product design`);
  lines.push(`- Design systems`);
  lines.push(`- Developer tools`);
  lines.push(`- AI-assisted workflows`);
  lines.push(``);

  // Stack — filter noise, keep it tight
  const languages = github?.languages || {};
  const topLangs = Object.entries(languages)
    .filter(([lang]) => !NOISE_LANGUAGES.has(lang))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([lang]) => lang);

  if (topLangs.length > 0) {
    lines.push(`## Stack`);
    lines.push(``);
    lines.push(`- ${topLangs.join(", ")}`);
    lines.push(`- Figma, Cursor, Next.js`);
    lines.push(``);
  }

  // Links
  lines.push(`## Links`);
  lines.push(``);
  lines.push(`- [X](https://x.com/${identity.twitter})`);
  lines.push(`- [GitHub](https://github.com/${identity.github})`);
  lines.push(`- [LinkedIn](https://linkedin.com/in/${identity.linkedin})`);
  lines.push(`- [Email](mailto:${identity.email})`);
  lines.push(`- [Website](https://eriks.design)`);
  lines.push(``);

  // Preferences
  lines.push(`## Preferences`);
  lines.push(``);
  if (identity.location) {
    lines.push(`- Location: ${identity.location}`);
  }
  lines.push(`- Communication: Async, X DMs, email`);
  lines.push(``);

  return lines.join("\n").trimEnd() + "\n";
}

async function main() {
  const latestRaw = await readFile("data/latest.json", "utf-8");
  const data: AggregatedData = JSON.parse(latestRaw);

  const metxt = buildMeTxt(data);

  await mkdir(dirname("public/me.txt"), { recursive: true });
  await writeFile("public/me.txt", metxt, "utf-8");

  console.log("✓ Generated public/me.txt");
  console.log(`  ${metxt.split("\n").length} lines`);
  console.log("");
  console.log(metxt);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
