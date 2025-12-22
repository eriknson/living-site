"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GlobalMenuBar } from "@/components/global-menu-bar";

// ========== TUNING PROPS - Adjust these to change all pills at once ==========
const PILL_CONFIG = {
  // Icon settings
  iconSize: 24,           // Icon size in px (was 20)
  iconStrokeWidth: 0.6,   // Stroke width to make icons slightly bolder (0 = no extra stroke)
  iconOpacity: 0.9,       // Default icon opacity (0-1)
  iconHoverOpacity: 1,  // Icon opacity on hover (0-1)
  // Label settings
  fontSize: 18,           // Text size in px (was inherited ~24px)
  fontWeight: 450,        // Font weight (400 = normal, 500 = medium, 600 = semibold)
  labelOpacity: 0.9,      // Label opacity (0-1)
  labelHoverOpacity: 1, // Label opacity on hover (0-1)
  // Background settings
  bgOpacity: 0.03,        // Background opacity (light mode)
  bgHoverOpacity: 0.05,   // Background opacity on hover (light mode)
  bgOpacityDark: 0.06,    // Background opacity (dark mode)
  bgHoverOpacityDark: 0.03, // Background opacity on hover (dark mode)
  // Layout settings
  gap: 10,                // Gap between icon and text in px
  paddingX: 16,           // Horizontal padding in px
  paddingY: 7,            // Vertical padding in px
  borderRadius: 999,      // Full rounded
};

function ExperimentalModes() {
  return (
    <p className="text-[15px] text-black/35 dark:text-white/35 leading-[1.8] max-w-[640px] mx-auto px-6 pb-6">
      This site has two experimental modes to rebuild itself. Explore{" "}
      <Link
        href="/agent"
        className="font-mono px-1.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-black/35 dark:text-white/35 hover:bg-black/[0.08] dark:hover:bg-white/[0.1] hover:text-black/50 dark:hover:text-white/50 transition-colors"
      >
        /agent
      </Link>{" "}
      for the daily updates, or{" "}
      <Link
        href="/new"
        className="font-mono px-1.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-black/35 dark:text-white/35 hover:bg-black/[0.08] dark:hover:bg-white/[0.1] hover:text-black/50 dark:hover:text-white/50 transition-colors"
      >
        /new
      </Link>{" "}
      to generate a fresh build on demand.
    </p>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const isReference = searchParams.get("reference") === "true";

  return (
    <div className="min-h-dvh bg-[#fafaf9] dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-[#e5e5e5] flex flex-col">
      {/* Menu Bar - hidden in reference mode for clean agent context */}
      {!isReference && (
        <div className="sticky top-0 z-50">
          <GlobalMenuBar currentRoute="/" />
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <main className="max-w-[640px] mx-auto px-6 pt-16 md:pt-24 w-full">
          {/* Bio paragraph */}
          <div 
            className="leading-snug text-black/85 dark:text-white/85"
            style={{ fontSize: 'clamp(24px, 5vw, 34px)' }}
          >
            <p>
              I'm building{" "}
            {/* ========== CURSOR PILL ========== */}
            <a
              href="https://cursor.com"
              className="group inline-flex items-center pill-bg"
              style={{
                padding: '0.15em 0.4em',
                borderRadius: PILL_CONFIG.borderRadius,
                transform: "translateY(0.15em)",
                '--bg-opacity': PILL_CONFIG.bgOpacity,
                '--bg-hover-opacity': PILL_CONFIG.bgHoverOpacity,
                '--bg-opacity-dark': PILL_CONFIG.bgOpacityDark,
                '--bg-hover-opacity-dark': PILL_CONFIG.bgHoverOpacityDark,
              } as React.CSSProperties}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                className="pill-icon dark:invert"
                style={{
                  height: "1em",
                  width: "auto",
                  '--icon-opacity': PILL_CONFIG.iconOpacity,
                  '--icon-hover-opacity': PILL_CONFIG.iconHoverOpacity,
                } as React.CSSProperties}
                viewBox="0 0 2238.7 532.09"
                aria-label="Cursor"
              >
                <path fill="currentColor" d="M457.43,125.94L244.42,2.96c-6.84-3.95-15.28-3.95-22.12,0L9.3,125.94c-5.75,3.32-9.3,9.46-9.3,16.11v247.99c0,6.64,3.55,12.79,9.3,16.11l213.01,122.98c6.84,3.95,15.28,3.95,22.12,0l213.01-122.98c5.75-3.32,9.3-9.46,9.3-16.11v-247.99c0-6.64-3.55-12.79-9.3-16.11h-.01ZM444.05,151.99l-205.63,356.16c-1.39,2.4-5.06,1.42-5.06-1.36v-233.21c0-4.66-2.49-8.97-6.53-11.31L24.87,145.67c-2.4-1.39-1.42-5.06,1.36-5.06h411.26c5.84,0,9.49,6.33,6.57,11.39h-.01Z"/>
                <path fill="currentColor" d="M722.44,138.08h90.64v49.93h-87.57c-47.24,0-84.11,27.27-84.11,84.88s36.87,84.88,84.11,84.88h87.57v49.93h-94.48c-79.12,0-135.19-46.47-135.19-134.8s59.91-134.8,139.03-134.8v-.02Z"/>
                <path fill="currentColor" d="M859.17,138.08h56.07v164.76c0,41.09,18.82,60.3,62.99,60.3s62.99-19.2,62.99-60.3v-164.76h56.07v176.28c0,59.91-38.02,97.94-119.06,97.94s-119.06-38.41-119.06-98.32v-175.9h0Z"/>
                <path fill="currentColor" d="M1390.32,214.5c0,29.96-17.28,53-40.33,62.99v.77c24.2,3.46,36.49,20.74,36.87,44.17l1.15,85.26h-56.07l-1.15-76.04c-.38-16.9-10.37-27.27-30.34-27.27h-93.33v103.31h-56.07V138.08h154.78c50.7,0,84.49,25.73,84.49,76.43h0ZM1333.86,222.19c0-23.04-12.29-35.72-35.33-35.72h-91.41v71.43h92.17c21.12,0,34.57-12.67,34.57-35.72h0Z"/>
                <path fill="currentColor" d="M1602.31,328.95c0-19.2-12.29-27.27-30.72-28.8l-62.22-5.76c-53.77-4.99-81.81-26.12-81.81-77.2s34.57-79.12,84.11-79.12h137.49v48.39h-133.65c-19.2,0-31.49,9.99-31.49,29.19s12.67,28.42,31.88,29.96l63.37,5.38c48.01,4.22,79.5,26.12,79.5,77.58s-33.41,79.12-80.65,79.12h-143.64v-48.39h138.26c18.05,0,29.57-12.29,29.57-30.34h0Z"/>
                <path fill="currentColor" d="M1822.77,133.47c84.49,0,137.88,54.15,137.88,139.03s-55.69,139.8-140.18,139.8-137.88-54.92-137.88-139.8,55.69-139.03,140.18-139.03ZM1902.65,272.88c0-56.84-33.03-90.25-81.04-90.25s-81.04,33.41-81.04,90.25,33.03,90.25,81.04,90.25,81.04-33.41,81.04-90.25Z"/>
                <path fill="currentColor" d="M2238.7,214.5c0,29.96-17.28,53-40.33,62.99v.77c24.2,3.46,36.49,20.74,36.87,44.17l1.15,85.26h-56.07l-1.15-76.04c-.38-16.9-10.37-27.27-30.34-27.27h-93.33v103.31h-56.07V138.08h154.78c50.7,0,84.49,25.73,84.49,76.43h0ZM2182.24,222.19c0-23.04-12.29-35.72-35.33-35.72h-91.41v71.43h92.17c21.12,0,34.57-12.67,34.57-35.72h0Z"/>
              </svg>
            </a>
              , the best<br />
              way to design software with AI.
            </p>
          </div>

        </main>

        {/* Spacer: fills remaining space on mobile, min 128px on desktop */}
        <div className="flex-1 md:flex-none md:min-h-[128px]" />

        {/* Contact links */}
        <div className="max-w-[640px] mx-auto px-6 w-full">
          <ul className="space-y-3 list-none p-0 m-0">
            {/* Follow on X */}
            <li>
              <a
                href="https://x.com/flowstated"
                className="group inline-flex items-center pill-bg"
                style={{
                  gap: PILL_CONFIG.gap,
                  padding: `${PILL_CONFIG.paddingY}px ${PILL_CONFIG.paddingX}px`,
                  fontSize: PILL_CONFIG.fontSize,
                  borderRadius: PILL_CONFIG.borderRadius,
                  '--bg-opacity': PILL_CONFIG.bgOpacity,
                  '--bg-hover-opacity': PILL_CONFIG.bgHoverOpacity,
                  '--bg-opacity-dark': PILL_CONFIG.bgOpacityDark,
                  '--bg-hover-opacity-dark': PILL_CONFIG.bgHoverOpacityDark,
                } as React.CSSProperties}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span
                  className="pill-label text-black dark:text-white"
                  style={{
                    fontWeight: PILL_CONFIG.fontWeight,
                    '--label-opacity': PILL_CONFIG.labelOpacity,
                    '--label-hover-opacity': PILL_CONFIG.labelHoverOpacity,
                  } as React.CSSProperties}
                >Follow on X</span>
              </a>
            </li>
            {/* Email */}
            <li>
              <a
                href="mailto:contact@eriks.design"
                className="group inline-flex items-center pill-bg"
                style={{
                  gap: PILL_CONFIG.gap,
                  padding: `${PILL_CONFIG.paddingY}px ${PILL_CONFIG.paddingX}px`,
                  fontSize: PILL_CONFIG.fontSize,
                  borderRadius: PILL_CONFIG.borderRadius,
                  '--bg-opacity': PILL_CONFIG.bgOpacity,
                  '--bg-hover-opacity': PILL_CONFIG.bgHoverOpacity,
                  '--bg-opacity-dark': PILL_CONFIG.bgOpacityDark,
                  '--bg-hover-opacity-dark': PILL_CONFIG.bgHoverOpacityDark,
                } as React.CSSProperties}
              >
                <span
                  className="pill-label text-black dark:text-white"
                  style={{
                    fontWeight: PILL_CONFIG.fontWeight,
                    '--label-opacity': PILL_CONFIG.labelOpacity,
                    '--label-hover-opacity': PILL_CONFIG.labelHoverOpacity,
                  } as React.CSSProperties}
                >Send an email</span>
              </a>
            </li>
            {/* GitHub */}
            <li>
              <a
                href="https://github.com/eriknson"
                className="group inline-flex items-center pill-bg"
                style={{
                  gap: PILL_CONFIG.gap,
                  padding: `${PILL_CONFIG.paddingY}px ${PILL_CONFIG.paddingX}px`,
                  fontSize: PILL_CONFIG.fontSize,
                  borderRadius: PILL_CONFIG.borderRadius,
                  '--bg-opacity': PILL_CONFIG.bgOpacity,
                  '--bg-hover-opacity': PILL_CONFIG.bgHoverOpacity,
                  '--bg-opacity-dark': PILL_CONFIG.bgOpacityDark,
                  '--bg-hover-opacity-dark': PILL_CONFIG.bgHoverOpacityDark,
                } as React.CSSProperties}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span
                  className="pill-label text-black dark:text-white"
                  style={{
                    fontWeight: PILL_CONFIG.fontWeight,
                    '--label-opacity': PILL_CONFIG.labelOpacity,
                    '--label-hover-opacity': PILL_CONFIG.labelHoverOpacity,
                  } as React.CSSProperties}
                >Checkout my GitHub</span>
              </a>
            </li>
            {/* Read my thoughts - Coming Soon (muted pill style) */}
            <li>
              <span
                className="inline-flex items-center bg-black/[0.02] dark:bg-white/[0.03]"
                style={{
                  gap: PILL_CONFIG.gap,
                  padding: `${PILL_CONFIG.paddingY}px ${PILL_CONFIG.paddingX}px`,
                  fontSize: PILL_CONFIG.fontSize,
                  borderRadius: PILL_CONFIG.borderRadius,
                  cursor: 'not-allowed',
                }}
              >
                <span
                  className="text-black/35 dark:text-white/35"
                  style={{ fontWeight: PILL_CONFIG.fontWeight }}
                >
                  Read my thoughts (soon)
                </span>
              </span>
            </li>
          </ul>
        </div>

        {/* Experiment section - hidden in reference mode */}
        {!isReference && (
          <div className="pt-8">
            <ExperimentalModes />
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
