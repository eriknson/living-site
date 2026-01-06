import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";

export type MainPageContent = {
  greeting: string;
  bio: string;
  links: {
    x: { text: string; url: string };
    github: { text: string; url: string };
    email: { text: string; url: string };
  };
  bioAfterLinks: string;
};

const MAIN_PAGE_PATH = path.join(process.cwd(), "data/main-page.json");

const DEFAULT_CONTENT: MainPageContent = {
  greeting: "Hej, I'm Erik.",
  bio: "This site is my playground to try things and write about what I learn. Follow me on",
  links: {
    x: {
      text: "X",
      url: "https://x.com/flowstated",
    },
    github: {
      text: "GitHub",
      url: "https://github.com/eriknson",
    },
    email: {
      text: "email",
      url: "mailto:contact@eriks.design?subject=Hej",
    },
  },
  bioAfterLinks: ", or send me an",
};

/**
 * Get main page content from JSON file
 */
export function getMainPageContent(): MainPageContent {
  if (!existsSync(MAIN_PAGE_PATH)) {
    // Create default file if it doesn't exist
    writeFileSync(MAIN_PAGE_PATH, JSON.stringify(DEFAULT_CONTENT, null, 2), "utf-8");
    return DEFAULT_CONTENT;
  }

  try {
    const content = readFileSync(MAIN_PAGE_PATH, "utf-8");
    return JSON.parse(content) as MainPageContent;
  } catch (error) {
    console.error("Error reading main page content:", error);
    return DEFAULT_CONTENT;
  }
}

/**
 * Update main page content
 */
export function updateMainPageContent(content: MainPageContent): void {
  writeFileSync(MAIN_PAGE_PATH, JSON.stringify(content, null, 2), "utf-8");
}
