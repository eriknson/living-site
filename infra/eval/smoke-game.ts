#!/usr/bin/env tsx
/**
 * Runtime smoke test for generated games using Playwright.
 *
 * Opens the game HTML in a headless browser at mobile and desktop sizes,
 * checks for console errors, verifies rendering, clicks start/restart,
 * and captures screenshots.
 *
 * Usage:
 *   pnpm run smoke-game -- generated/games/seed.html
 *   pnpm run smoke-game -- generated/games/seed.html --json
 *   pnpm run smoke-game -- generated/games/seed.html --screenshots-dir /tmp/shots
 */

import { chromium, type Page, type ConsoleMessage } from "@playwright/test";
import { resolve } from "path";
import { existsSync, mkdirSync } from "fs";

interface SmokeResult {
  passed: boolean;
  issues: string[];
  warnings: string[];
  consoleErrors: string[];
  uncaughtErrors: string[];
  screenshotPaths: string[];
}

const MOBILE_VIEWPORT = { width: 390, height: 844 };
const DESKTOP_VIEWPORT = { width: 1280, height: 800 };

const START_PATTERNS = [
  "start",
  "play",
  "begin",
  "go",
  "tap to start",
  "click to start",
  "tap to play",
];

const RESTART_PATTERNS = [
  "restart",
  "play again",
  "try again",
  "new game",
  "reset",
];

async function findButton(page: Page, patterns: string[]): Promise<boolean> {
  for (const pattern of patterns) {
    const btn = page.getByRole("button", { name: new RegExp(pattern, "i") });
    if (await btn.first().isVisible({ timeout: 500 }).catch(() => false)) {
      await btn.first().click();
      return true;
    }
  }

  for (const pattern of patterns) {
    const el = page.locator(`text=/${pattern}/i`).first();
    if (await el.isVisible({ timeout: 500 }).catch(() => false)) {
      const tag = await el.evaluate((e) => e.tagName.toLowerCase()).catch(() => "");
      if (tag === "button" || tag === "a" || tag === "div" || tag === "span") {
        await el.click();
        return true;
      }
    }
  }

  return false;
}

async function smokeTest(
  filePath: string,
  screenshotsDir: string | null
): Promise<SmokeResult> {
  const absPath = resolve(filePath);
  if (!existsSync(absPath)) {
    return {
      passed: false,
      issues: [`File not found: ${filePath}`],
      warnings: [],
      consoleErrors: [],
      uncaughtErrors: [],
      screenshotPaths: [],
    };
  }

  const fileUrl = `file://${absPath}`;
  const issues: string[] = [];
  const warnings: string[] = [];
  const consoleErrors: string[] = [];
  const uncaughtErrors: string[] = [];
  const screenshotPaths: string[] = [];

  if (screenshotsDir && !existsSync(screenshotsDir)) {
    mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  try {
    // --- Mobile viewport ---
    const mobileContext = await browser.newContext({
      viewport: MOBILE_VIEWPORT,
      hasTouch: true,
      isMobile: true,
      colorScheme: "dark",
    });
    const mobilePage = await mobileContext.newPage();

    const mobileConsoleErrors: string[] = [];
    const mobileUncaughtErrors: string[] = [];

    mobilePage.on("console", (msg: ConsoleMessage) => {
      if (msg.type() === "error") {
        mobileConsoleErrors.push(msg.text());
      }
    });

    mobilePage.on("pageerror", (err) => {
      mobileUncaughtErrors.push(err.message);
    });

    await mobilePage.goto(fileUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
    await mobilePage.waitForTimeout(1000);

    // Check page rendered something visible
    const mobileBodyVisible = await mobilePage.evaluate(() => {
      return document.body && document.body.offsetHeight > 0;
    });
    if (!mobileBodyVisible) {
      issues.push("Mobile: page body has zero height — game may not render");
    }

    // Try to click start
    const startedMobile = await findButton(mobilePage, START_PATTERNS);
    if (startedMobile) {
      await mobilePage.waitForTimeout(2000);
    } else {
      warnings.push("Mobile: could not find a start/play button to click");
    }

    if (screenshotsDir) {
      const mobileShotPath = resolve(screenshotsDir, "mobile-playing.png");
      await mobilePage.screenshot({ path: mobileShotPath, fullPage: false });
      screenshotPaths.push(mobileShotPath);
    }

    // Try tap interaction in center of viewport
    await mobilePage.touchscreen.tap(
      MOBILE_VIEWPORT.width / 2,
      MOBILE_VIEWPORT.height / 2
    );
    await mobilePage.waitForTimeout(500);

    // Try restart
    const restartedMobile = await findButton(mobilePage, RESTART_PATTERNS);
    if (!restartedMobile) {
      warnings.push("Mobile: could not find a restart button to click");
    }

    consoleErrors.push(...mobileConsoleErrors);
    uncaughtErrors.push(...mobileUncaughtErrors);
    await mobileContext.close();

    // --- Desktop viewport ---
    const desktopContext = await browser.newContext({
      viewport: DESKTOP_VIEWPORT,
      colorScheme: "light",
    });
    const desktopPage = await desktopContext.newPage();

    const desktopConsoleErrors: string[] = [];
    const desktopUncaughtErrors: string[] = [];

    desktopPage.on("console", (msg: ConsoleMessage) => {
      if (msg.type() === "error") {
        desktopConsoleErrors.push(msg.text());
      }
    });

    desktopPage.on("pageerror", (err) => {
      desktopUncaughtErrors.push(err.message);
    });

    await desktopPage.goto(fileUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
    await desktopPage.waitForTimeout(1000);

    await findButton(desktopPage, START_PATTERNS);
    await desktopPage.waitForTimeout(1000);

    if (screenshotsDir) {
      const desktopShotPath = resolve(screenshotsDir, "desktop-playing.png");
      await desktopPage.screenshot({ path: desktopShotPath, fullPage: false });
      screenshotPaths.push(desktopShotPath);
    }

    consoleErrors.push(...desktopConsoleErrors);
    uncaughtErrors.push(...desktopUncaughtErrors);
    await desktopContext.close();

    // Evaluate results
    if (uncaughtErrors.length > 0) {
      issues.push(
        `${uncaughtErrors.length} uncaught JS error(s): ${uncaughtErrors[0]}${uncaughtErrors.length > 1 ? ` (+${uncaughtErrors.length - 1} more)` : ""}`
      );
    }

    if (consoleErrors.length > 0) {
      const filtered = consoleErrors.filter(
        (e) => !e.includes("favicon") && !e.includes("404")
      );
      if (filtered.length > 0) {
        warnings.push(
          `${filtered.length} console error(s): ${filtered[0]}${filtered.length > 1 ? ` (+${filtered.length - 1} more)` : ""}`
        );
      }
    }
  } finally {
    await browser.close();
  }

  return {
    passed: issues.length === 0,
    issues,
    warnings,
    consoleErrors,
    uncaughtErrors,
    screenshotPaths,
  };
}

// CLI
const args = process.argv.slice(2);
const filePath = args.find((a) => !a.startsWith("--"));
const jsonOutput = args.includes("--json");

let screenshotsDir: string | null = null;
const sdIdx = args.indexOf("--screenshots-dir");
if (sdIdx !== -1 && args[sdIdx + 1]) {
  screenshotsDir = args[sdIdx + 1];
}

if (!filePath) {
  console.error(
    "Usage: smoke-game <file.html> [--json] [--screenshots-dir <dir>]"
  );
  process.exit(1);
}

smokeTest(filePath, screenshotsDir)
  .then((result) => {
    if (jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log("");
      console.log(`=== Game Smoke Test: ${filePath} ===`);
      console.log("");

      if (result.issues.length > 0) {
        console.log("\x1b[31m\u26a0 ISSUES:\x1b[0m");
        result.issues.forEach((i) => console.log(`  \u2022 ${i}`));
        console.log("");
      }

      if (result.warnings.length > 0) {
        console.log("\x1b[33m\u26a1 WARNINGS:\x1b[0m");
        result.warnings.forEach((w) => console.log(`  \u2022 ${w}`));
        console.log("");
      }

      if (result.screenshotPaths.length > 0) {
        console.log("Screenshots:");
        result.screenshotPaths.forEach((p) => console.log(`  ${p}`));
        console.log("");
      }

      if (result.passed) {
        console.log(
          "\x1b[32m\u2713 PASSED - Game loads and runs without errors\x1b[0m"
        );
      } else {
        console.log(
          "\x1b[31m\u2717 FAILED - Game has runtime issues\x1b[0m"
        );
      }
      console.log("");
    }

    process.exit(result.passed ? 0 : 1);
  })
  .catch((err) => {
    console.error(`Smoke test error: ${err.message}`);
    process.exit(1);
  });
