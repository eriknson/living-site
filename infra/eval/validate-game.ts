#!/usr/bin/env tsx
/**
 * Validate a generated game HTML build for quality/compliance issues.
 *
 * Usage:
 *   pnpm run validate-game -- generated/games/cursor-grok-4.5-high-fast.html
 *   pnpm run validate-game -- generated/games/cursor-grok-4.5-high-fast.html --json
 */

import { readFileSync, statSync } from "fs";

const CDN_ALLOWLIST = [
  "unpkg.com",
  "esm.sh",
  "cdn.jsdelivr.net",
];

const MAX_SIZE_BYTES = 200 * 1024; // 200 KB

interface ValidationResult {
  passed: boolean;
  issues: string[];
  warnings: string[];
  checks: Record<string, { passed: boolean; detail?: string }>;
}

function isAllowlistedUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return CDN_ALLOWLIST.some(
      (cdn) => hostname === cdn || hostname.endsWith("." + cdn)
    );
  } catch {
    return false;
  }
}

function validateGame(html: string, filePath: string): ValidationResult {
  const issues: string[] = [];
  const warnings: string[] = [];
  const checks: Record<string, { passed: boolean; detail?: string }> = {};
  const lower = html.toLowerCase();

  // 1. DOCTYPE
  const hasDoctype = lower.trimStart().startsWith("<!doctype html");
  checks["doctype"] = {
    passed: hasDoctype,
    detail: hasDoctype ? "DOCTYPE present" : "Missing <!DOCTYPE html>",
  };
  if (!hasDoctype) issues.push("Missing <!DOCTYPE html>");

  // 2. Viewport meta with viewport-fit=cover
  const viewportMatch = html.match(
    /<meta[^>]*name\s*=\s*["']viewport["'][^>]*content\s*=\s*["']([^"']*)["'][^>]*>/i
  );
  const viewportContent = viewportMatch?.[1] ?? "";
  const hasViewport =
    viewportContent.includes("width=device-width") &&
    viewportContent.includes("viewport-fit=cover");
  checks["viewport"] = {
    passed: hasViewport,
    detail: hasViewport
      ? "Viewport meta with viewport-fit=cover"
      : "Missing viewport meta with viewport-fit=cover",
  };
  if (!hasViewport)
    issues.push(
      "Missing viewport meta tag with width=device-width and viewport-fit=cover"
    );

  // 3. Touch input handlers
  const touchPatterns = [
    "touchstart",
    "touchmove",
    "touchend",
    "pointerdown",
    "pointermove",
    "pointerup",
  ];
  const foundTouch = touchPatterns.filter((p) => lower.includes(p));
  const hasTouch = foundTouch.length > 0;
  checks["touch-input"] = {
    passed: hasTouch,
    detail: hasTouch
      ? `Touch handlers: ${foundTouch.join(", ")}`
      : "No touch/pointer input handlers found",
  };
  if (!hasTouch)
    issues.push(
      "No touch input handlers found (need touchstart/pointerdown etc.)"
    );

  // 4. Keyboard input handlers
  const keyboardPatterns = ["keydown", "keyup", "keypress"];
  const foundKeyboard = keyboardPatterns.filter((p) => lower.includes(p));
  const hasKeyboard = foundKeyboard.length > 0;
  checks["keyboard-input"] = {
    passed: hasKeyboard,
    detail: hasKeyboard
      ? `Keyboard handlers: ${foundKeyboard.join(", ")}`
      : "No keyboard input handlers found",
  };
  if (!hasKeyboard)
    warnings.push(
      "No keyboard input handlers found (desktop fallback recommended)"
    );

  // 5. Restart control
  const restartPatterns = [
    /restart/i,
    /play\s*again/i,
    /new\s*game/i,
    /try\s*again/i,
    /reset/i,
  ];
  const hasRestart = restartPatterns.some((p) => p.test(html));
  checks["restart"] = {
    passed: hasRestart,
    detail: hasRestart
      ? "Restart/play-again control found"
      : "No restart control found",
  };
  if (!hasRestart)
    issues.push(
      'No restart control found (need a button with text like "Restart", "Play Again", "New Game", or "Try Again")'
    );

  // 6. File size
  let fileSize: number;
  try {
    fileSize = statSync(filePath).size;
  } catch {
    fileSize = Buffer.byteLength(html, "utf-8");
  }
  const sizeOk = fileSize <= MAX_SIZE_BYTES;
  const sizeKB = (fileSize / 1024).toFixed(1);
  checks["file-size"] = {
    passed: sizeOk,
    detail: sizeOk
      ? `${sizeKB} KB (limit: ${MAX_SIZE_BYTES / 1024} KB)`
      : `${sizeKB} KB exceeds ${MAX_SIZE_BYTES / 1024} KB limit`,
  };
  if (!sizeOk) issues.push(`File exceeds 200KB (actual: ${sizeKB} KB)`);

  // 7. External resources on allowlist (src/href attributes)
  const srcPatterns =
    /(?:src|href)\s*=\s*["'](https?:\/\/[^"'\s]+)["']/gi;
  const externalUrls: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = srcPatterns.exec(html)) !== null) {
    externalUrls.push(match[1]);
  }

  const disallowed = externalUrls.filter((url) => !isAllowlistedUrl(url));
  const cdnOk = disallowed.length === 0;
  checks["cdn-allowlist"] = {
    passed: cdnOk,
    detail: cdnOk
      ? `All ${externalUrls.length} external URLs on allowlist`
      : `${disallowed.length} URL(s) not on allowlist`,
  };
  if (!cdnOk) {
    disallowed.forEach((url) =>
      issues.push(`External resource not on CDN allowlist: ${url}`)
    );
  }

  // 8. External url() resources in CSS
  const cssUrlPattern = /url\(\s*["']?(https?:\/\/[^"')]+)["']?\s*\)/gi;
  const cssUrls: string[] = [];
  let cssMatch: RegExpExecArray | null;
  while ((cssMatch = cssUrlPattern.exec(html)) !== null) {
    cssUrls.push(cssMatch[1]);
  }
  const disallowedCss = cssUrls.filter((url) => !isAllowlistedUrl(url));
  const cssOk = disallowedCss.length === 0;
  checks["css-url-allowlist"] = {
    passed: cssOk,
    detail: cssOk
      ? `All CSS url() resources OK`
      : `${disallowedCss.length} CSS url() not on allowlist`,
  };
  if (!cssOk) {
    disallowedCss.forEach((url) =>
      issues.push(`External url() resource not on CDN allowlist: ${url}`)
    );
  }

  // 9. No localStorage / sessionStorage / IndexedDB
  const storagePatterns = [
    { pattern: /localStorage/g, label: "localStorage" },
    { pattern: /sessionStorage/g, label: "sessionStorage" },
    { pattern: /indexedDB/gi, label: "IndexedDB" },
    { pattern: /document\.cookie\s*=/g, label: "document.cookie (write)" },
  ];
  const foundStorage = storagePatterns.filter((s) => s.pattern.test(html));
  const noStorage = foundStorage.length === 0;
  checks["no-persistence"] = {
    passed: noStorage,
    detail: noStorage
      ? "No persistence APIs used"
      : `Uses: ${foundStorage.map((s) => s.label).join(", ")}`,
  };
  if (!noStorage)
    issues.push(
      `Uses ${foundStorage.map((s) => s.label).join(", ")} (persistence not allowed)`
    );

  // 10. No runtime network APIs (fetch, XHR, WebSocket, EventSource)
  // We look for usage patterns, excluding common false positives in comments
  const networkPatterns = [
    { pattern: /\bfetch\s*\(/g, label: "fetch()" },
    { pattern: /new\s+XMLHttpRequest/g, label: "XMLHttpRequest" },
    { pattern: /new\s+WebSocket/g, label: "WebSocket" },
    { pattern: /new\s+EventSource/g, label: "EventSource" },
  ];
  const foundNetwork = networkPatterns.filter((s) => s.pattern.test(html));
  const noNetwork = foundNetwork.length === 0;
  checks["no-network"] = {
    passed: noNetwork,
    detail: noNetwork
      ? "No runtime network APIs"
      : `Uses: ${foundNetwork.map((s) => s.label).join(", ")}`,
  };
  if (!noNetwork) {
    issues.push(
      `Uses disallowed network API: ${foundNetwork.map((s) => s.label).join(", ")}`
    );
  }

  // 11. Dark mode support
  const hasDarkMode =
    lower.includes("prefers-color-scheme: dark") ||
    lower.includes("prefers-color-scheme:dark");
  checks["dark-mode"] = {
    passed: hasDarkMode,
    detail: hasDarkMode
      ? "Has prefers-color-scheme: dark"
      : "Missing dark mode support",
  };
  if (!hasDarkMode) issues.push("Missing dark mode support");

  // 12. No purple gradients
  const purpleGradientPattern =
    /gradient\s*\([^)]*(?:purple|#[89a-f][0-9a-f](?:[0-9a-f]{2})?[89a-f][0-9a-f](?:[0-9a-f]{2})?ff?|rgb\(\s*1[2-9]\d|2\d\d\s*,\s*\d{1,2}\s*,\s*1[2-9]\d|2\d\d\s*\))/i;
  const hasPurpleGradient = purpleGradientPattern.test(html);
  checks["no-purple-gradient"] = {
    passed: !hasPurpleGradient,
    detail: hasPurpleGradient
      ? "Contains purple gradient"
      : "No purple gradients detected",
  };
  if (hasPurpleGradient) issues.push("Contains purple gradient");

  // 13. Game container element
  const hasCanvas = lower.includes("<canvas");
  const hasGameRoot = lower.includes('id="game"') ||
    lower.includes('id="app"') ||
    lower.includes('id="arena"') ||
    lower.includes('id="root"') ||
    lower.includes('id="stage"') ||
    lower.includes('id="container"');
  const hasSvgRoot = lower.includes("<svg");
  const hasGameContainer = hasCanvas || hasGameRoot || hasSvgRoot;
  checks["game-container"] = {
    passed: hasGameContainer,
    detail: hasGameContainer
      ? `Game container: ${[hasCanvas && "canvas", hasGameRoot && "game div", hasSvgRoot && "svg"].filter(Boolean).join(", ")}`
      : "No game container element found (canvas, #game, #arena, etc.)",
  };
  if (!hasGameContainer)
    warnings.push("No game container element found (canvas, #game, #app, #arena, svg)");

  // 14. Touch-action on game area (prevent scroll hijacking)
  const hasTouchAction = lower.includes("touch-action") && 
    (lower.includes("touch-action: none") || lower.includes("touch-action:none") ||
     lower.includes("touch-action: manipulation") || lower.includes("touch-action:manipulation"));
  checks["touch-action"] = {
    passed: hasTouchAction,
    detail: hasTouchAction
      ? "touch-action CSS found"
      : "No touch-action: none on game area (may cause scroll issues on mobile)",
  };
  if (!hasTouchAction)
    warnings.push("Missing touch-action: none on game canvas/area — mobile may scroll during play");

  // 15. User-select none on game area
  const hasUserSelect = lower.includes("user-select: none") || lower.includes("user-select:none");
  checks["user-select"] = {
    passed: hasUserSelect,
    detail: hasUserSelect
      ? "user-select: none found"
      : "No user-select: none (text selection may interfere with gameplay)",
  };
  if (!hasUserSelect)
    warnings.push("Missing user-select: none — text selection may interfere with gameplay");

  // 16. Deterministic smoke-test control hooks (REQUIRED by the contract).
  // The automated smoke test clicks a start and a restart control; without these
  // hooks it can't reliably drive the game, so a missing hook is treated as a
  // must-fix issue here (routing it into the polish loop) rather than letting it
  // surface only as a flaky runtime smoke failure later.
  const hasSmokeStart =
    /<button[^>]*data-smoke\s*=\s*["']start["'][^>]*>/i.test(html);
  checks["smoke-start-hook"] = {
    passed: hasSmokeStart,
    detail: hasSmokeStart
      ? '<button data-smoke="start"> present'
      : 'Missing <button data-smoke="start">',
  };
  if (!hasSmokeStart)
    issues.push(
      'Missing required start control: add a real <button data-smoke="start">…</button> that the smoke test can click to begin the game',
    );

  const hasSmokeRestart =
    /<button[^>]*data-smoke\s*=\s*["']restart["'][^>]*>/i.test(html);
  checks["smoke-restart-hook"] = {
    passed: hasSmokeRestart,
    detail: hasSmokeRestart
      ? '<button data-smoke="restart"> present'
      : 'Missing <button data-smoke="restart">',
  };
  if (!hasSmokeRestart)
    issues.push(
      'Missing required restart control: add a real <button data-smoke="restart">…</button> shown after game over for replay',
    );

  return {
    passed: issues.length === 0,
    issues,
    warnings,
    checks,
  };
}

// CLI
const args = process.argv.slice(2);
const filePath = args.find((a) => !a.startsWith("--"));
const jsonOutput = args.includes("--json");

if (!filePath) {
  console.error("Usage: validate-game <file.html> [--json]");
  process.exit(1);
}

try {
  const html = readFileSync(filePath, "utf-8");
  const result = validateGame(html, filePath);

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("");
    console.log(`=== Game Validation: ${filePath} ===`);
    console.log("");

    for (const [name, check] of Object.entries(result.checks)) {
      const icon = check.passed ? "\u2713" : "\u2717";
      const color = check.passed ? "\x1b[32m" : "\x1b[31m";
      console.log(`${color}${icon}\x1b[0m ${name}: ${check.detail || ""}`);
    }

    console.log("");

    if (result.issues.length > 0) {
      console.log("\x1b[31m\u26a0 ISSUES (must fix):\x1b[0m");
      result.issues.forEach((i) => console.log(`  \u2022 ${i}`));
      console.log("");
    }

    if (result.warnings.length > 0) {
      console.log("\x1b[33m\u26a1 WARNINGS:\x1b[0m");
      result.warnings.forEach((w) => console.log(`  \u2022 ${w}`));
      console.log("");
    }

    if (result.passed) {
      console.log(
        "\x1b[32m\u2713 PASSED - Game meets quality requirements\x1b[0m"
      );
    } else {
      console.log(
        "\x1b[31m\u2717 FAILED - Game has issues that need fixing\x1b[0m"
      );
    }
    console.log("");
  }

  process.exit(result.passed ? 0 : 1);
} catch (error) {
  console.error(`Error reading file: ${error}`);
  process.exit(1);
}
