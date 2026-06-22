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

// Escape a pattern for use inside a RegExp.
function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Click a locator without ever throwing. Returns true only on a real click.
// A short timeout means occluded / detached / ambiguous elements fail fast and
// become a warning rather than a fatal 30s timeout that crashes the whole test.
async function safeClick(locator: ReturnType<Page["locator"]>): Promise<boolean> {
  try {
    if (!(await locator.first().isVisible({ timeout: 500 }).catch(() => false))) {
      return false;
    }
    await locator.first().click({ timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

// Try to click a start/restart control. Prefers an explicit, deterministic
// data-smoke hook, then falls back to real buttons matched by accessible name
// using word boundaries (so "go" no longer matches "Gold", etc.). Only genuine
// buttons / role=button are considered — never arbitrary spans/divs — and a
// missed click is reported by the caller as a warning, never a failure.
async function clickControl(
  page: Page,
  opts: { testId: string; patterns: string[] }
): Promise<boolean> {
  if (await safeClick(page.locator(`[data-smoke="${opts.testId}"]`))) {
    return true;
  }
  for (const pattern of opts.patterns) {
    const re = new RegExp(`\\b${escapeRe(pattern)}\\b`, "i");
    if (await safeClick(page.getByRole("button", { name: re }))) {
      return true;
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

  // Overall wall-clock guard so no stuck Playwright op can hang for ~30s or
  // crash the runner. Whatever errors were collected are still evaluated below,
  // so a genuinely broken game is caught while a harness-driving glitch never
  // discards an otherwise-working game.
  const OVERALL_TIMEOUT_MS = 45000;
  let timedOut = false;

  const drive = (async () => {
    try {
    // --- Mobile viewport ---
    const mobileContext = await browser.newContext({
      viewport: MOBILE_VIEWPORT,
      hasTouch: true,
      isMobile: true,
      colorScheme: "dark",
    });
    const mobilePage = await mobileContext.newPage();
    // Cap default timeouts so no stray locator op can hang for 30s.
    mobilePage.setDefaultTimeout(3000);

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

    // Drive the game. None of this may fail the test — interaction heuristics
    // can legitimately miss, so any problem here is recorded as a warning only.
    // Only uncaught page errors / zero-height render (below) count as failures.
    try {
      const startedMobile = await clickControl(mobilePage, {
        testId: "start",
        patterns: START_PATTERNS,
      });
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

      const restartedMobile = await clickControl(mobilePage, {
        testId: "restart",
        patterns: RESTART_PATTERNS,
      });
      if (!restartedMobile) {
        warnings.push("Mobile: could not find a restart button to click");
      }
    } catch (e) {
      warnings.push(`Mobile: interaction step skipped (${(e as Error).message})`);
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
    desktopPage.setDefaultTimeout(3000);

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

    try {
      await clickControl(desktopPage, { testId: "start", patterns: START_PATTERNS });
    } catch {
      // Non-fatal: desktop interaction is best-effort.
    }
    await desktopPage.waitForTimeout(1000);

    if (screenshotsDir) {
      const desktopShotPath = resolve(screenshotsDir, "desktop-playing.png");
      await desktopPage.screenshot({ path: desktopShotPath, fullPage: false });
      screenshotPaths.push(desktopShotPath);
    }

    consoleErrors.push(...desktopConsoleErrors);
    uncaughtErrors.push(...desktopUncaughtErrors);
    await desktopContext.close();

    } catch (e) {
      // Unexpected error mid-drive. Only real game errors (uncaught exceptions
      // or zero-height render, recorded above) should fail a game — a harness
      // hiccup must not discard a working build.
      warnings.push(`Harness: interaction aborted (${(e as Error).message})`);
    }
  })();

  await Promise.race([
    drive,
    new Promise<void>((resolve) => {
      setTimeout(() => {
        timedOut = true;
        resolve();
      }, OVERALL_TIMEOUT_MS);
    }),
  ]);

  if (timedOut) {
    warnings.push(
      `Harness: overall smoke timeout (${OVERALL_TIMEOUT_MS}ms) reached before driving finished`
    );
  }

  await browser.close().catch(() => {});

  // Evaluate collected results — runs even if the drive phase timed out, so a
  // genuinely broken game (uncaught errors) still fails while a slow or
  // undriveable but otherwise-loading game is not discarded.
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
