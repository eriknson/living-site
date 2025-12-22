/**
 * /reference - Clean HTML reference for AI agents
 * 
 * Returns a standalone HTML file with all CSS inlined.
 * No Next.js framework code, no client-side JavaScript.
 * This gives agents a clean, readable baseline to work from.
 */

import { NextResponse } from "next/server";

// The Cursor logo SVG path data
const CURSOR_LOGO_SVG = `<svg viewBox="0 0 2238.7 532.09" aria-label="Cursor" style="height:1em;width:auto;opacity:0.9">
  <path fill="currentColor" d="M457.43,125.94L244.42,2.96c-6.84-3.95-15.28-3.95-22.12,0L9.3,125.94c-5.75,3.32-9.3,9.46-9.3,16.11v247.99c0,6.64,3.55,12.79,9.3,16.11l213.01,122.98c6.84,3.95,15.28,3.95,22.12,0l213.01-122.98c5.75-3.32,9.3-9.46,9.3-16.11v-247.99c0-6.64-3.55-12.79-9.3-16.11h-.01ZM444.05,151.99l-205.63,356.16c-1.39,2.4-5.06,1.42-5.06-1.36v-233.21c0-4.66-2.49-8.97-6.53-11.31L24.87,145.67c-2.4-1.39-1.42-5.06,1.36-5.06h411.26c5.84,0,9.49,6.33,6.57,11.39h-.01Z"/>
  <path fill="currentColor" d="M722.44,138.08h90.64v49.93h-87.57c-47.24,0-84.11,27.27-84.11,84.88s36.87,84.88,84.11,84.88h87.57v49.93h-94.48c-79.12,0-135.19-46.47-135.19-134.8s59.91-134.8,139.03-134.8v-.02Z"/>
  <path fill="currentColor" d="M859.17,138.08h56.07v164.76c0,41.09,18.82,60.3,62.99,60.3s62.99-19.2,62.99-60.3v-164.76h56.07v176.28c0,59.91-38.02,97.94-119.06,97.94s-119.06-38.41-119.06-98.32v-175.9h0Z"/>
  <path fill="currentColor" d="M1390.32,214.5c0,29.96-17.28,53-40.33,62.99v.77c24.2,3.46,36.49,20.74,36.87,44.17l1.15,85.26h-56.07l-1.15-76.04c-.38-16.9-10.37-27.27-30.34-27.27h-93.33v103.31h-56.07V138.08h154.78c50.7,0,84.49,25.73,84.49,76.43h0ZM1333.86,222.19c0-23.04-12.29-35.72-35.33-35.72h-91.41v71.43h92.17c21.12,0,34.57-12.67,34.57-35.72h0Z"/>
  <path fill="currentColor" d="M1602.31,328.95c0-19.2-12.29-27.27-30.72-28.8l-62.22-5.76c-53.77-4.99-81.81-26.12-81.81-77.2s34.57-79.12,84.11-79.12h137.49v48.39h-133.65c-19.2,0-31.49,9.99-31.49,29.19s12.67,28.42,31.88,29.96l63.37,5.38c48.01,4.22,79.5,26.12,79.5,77.58s-33.41,79.12-80.65,79.12h-143.64v-48.39h138.26c18.05,0,29.57-12.29,29.57-30.34h0Z"/>
  <path fill="currentColor" d="M1822.77,133.47c84.49,0,137.88,54.15,137.88,139.03s-55.69,139.8-140.18,139.8-137.88-54.92-137.88-139.8,55.69-139.03,140.18-139.03ZM1902.65,272.88c0-56.84-33.03-90.25-81.04-90.25s-81.04,33.41-81.04,90.25,33.03,90.25,81.04,90.25,81.04-33.41,81.04-90.25Z"/>
  <path fill="currentColor" d="M2238.7,214.5c0,29.96-17.28,53-40.33,62.99v.77c24.2,3.46,36.49,20.74,36.87,44.17l1.15,85.26h-56.07l-1.15-76.04c-.38-16.9-10.37-27.27-30.34-27.27h-93.33v103.31h-56.07V138.08h154.78c50.7,0,84.49,25.73,84.49,76.43h0ZM2182.24,222.19c0-23.04-12.29-35.72-35.33-35.72h-91.41v71.43h92.17c21.12,0,34.57-12.67,34.57-35.72h0Z"/>
</svg>`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Erik Nilsson</title>
  <meta name="description" content="Product designer at Cursor, making tools for building software with AI.">
  <style>
    /* Reset */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    
    /* Variables */
    :root {
      --bg: #fafaf9;
      --text: #1a1a1a;
      --text-muted: rgba(26, 26, 26, 0.85);
      --text-light: rgba(26, 26, 26, 0.35);
      --pill-bg: rgba(0, 0, 0, 0.03);
      --pill-bg-hover: rgba(0, 0, 0, 0.05);
      color-scheme: light dark;
    }
    
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0a0a0a;
        --text: #e5e5e5;
        --text-muted: rgba(229, 229, 229, 0.85);
        --text-light: rgba(229, 229, 229, 0.35);
        --pill-bg: rgba(255, 255, 255, 0.06);
        --pill-bg-hover: rgba(255, 255, 255, 0.08);
      }
    }
    
    /* Base */
    html, body {
      height: 100%;
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
      background: var(--bg);
      color: var(--text);
    }
    
    body {
      min-height: 100vh;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
    }
    
    /* Layout */
    main {
      flex: 1;
      display: flex;
      flex-direction: column;
      max-width: 640px;
      margin: 0 auto;
      padding: 64px 24px 32px;
      width: 100%;
    }
    
    @media (min-width: 768px) {
      main { padding-top: 96px; }
    }
    
    /* Bio */
    .bio {
      font-size: clamp(21px, 5.2vw, 34px);
      line-height: 1.3;
      color: var(--text-muted);
    }
    
    /* Cursor pill (inline in bio) */
    .cursor-link {
      display: inline-flex;
      align-items: center;
      padding: 0.15em 0.4em;
      height: 1.5em;
      border-radius: 999px;
      background: var(--pill-bg);
      text-decoration: none;
      color: inherit;
      transition: background 0.15s ease;
      transform: translateY(0.2em);
    }
    
    .cursor-link:hover {
      background: var(--pill-bg-hover);
    }
    
    /* Spacer */
    .spacer {
      flex: 1;
      min-height: 128px;
    }
    
    @media (max-width: 767px) {
      .spacer { min-height: 0; }
    }
    
    /* Links list */
    .links {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .link {
      display: inline-flex;
      align-items: center;
      padding: 7px 16px;
      border-radius: 999px;
      background: var(--pill-bg);
      font-size: 15px;
      font-weight: 500;
      text-decoration: none;
      color: var(--text-muted);
      transition: background 0.15s ease;
    }
    
    @media (min-width: 640px) {
      .link { font-size: 18px; }
    }
    
    .link:hover {
      background: var(--pill-bg-hover);
    }
    
    .link-disabled {
      background: var(--pill-bg);
      color: var(--text-light);
      cursor: not-allowed;
    }
  </style>
</head>
<body>
  <main>
    <!-- Bio -->
    <p class="bio">
      I'm a designer at 
      <a href="https://cursor.com" class="cursor-link" target="_blank" rel="noopener noreferrer">${CURSOR_LOGO_SVG}</a>, making<br>
      tools for building software with AI.
    </p>
    
    <div class="spacer"></div>
    
    <!-- Contact Links -->
    <ul class="links">
      <li><a href="https://x.com/flowstated" class="link" target="_blank" rel="noopener noreferrer">Follow on X</a></li>
      <li><a href="mailto:contact@eriks.design" class="link">Send an email</a></li>
      <li><a href="https://github.com/eriknson" class="link" target="_blank" rel="noopener noreferrer">Checkout my GitHub</a></li>
      <li><span class="link link-disabled">Read my thoughts (soon)</span></li>
    </ul>
  </main>
</body>
</html>`;

export async function GET() {
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600", // Cache for 1 hour
    },
  });
}

