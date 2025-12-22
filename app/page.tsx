"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GlobalMenuBar } from "@/components/global-menu-bar";

function ExperimentalModes() {
  const searchParams = useSearchParams();
  const isReference = searchParams.get("reference") === "true";

  if (isReference) return null;

  return (
    <p className="text-[14px] text-black/35 dark:text-white/35 leading-[1.8] max-w-[580px] mx-auto px-6 pb-6">
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

// ========== TUNING PROPS - Adjust these to change all pills at once ==========
const PILL_CONFIG = {
  // Icon settings
  iconSize: 20,           // Icon size in px (was 20)
  iconStrokeWidth: 0.8,   // Stroke width to make icons slightly bolder (0 = no extra stroke)
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
  gap: 8,                // Gap between icon and text in px
  paddingX: 14,           // Horizontal padding in px
  paddingY: 6,            // Vertical padding in px
  borderRadius: 999,      // Full rounded
};

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-[#fafaf9] dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-[#e5e5e5] flex flex-col">
      {/* Menu Bar */}
      <div className="sticky top-0 z-50">
        <GlobalMenuBar currentRoute="/" />
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-[580px] mx-auto px-6 py-16 md:py-24 w-full">
        {/* Bio paragraphs - conversational style like leerob/anyblockers */}
        <div className="space-y-5 text-[24px] leading-relaxed text-black/85 dark:text-white/85 mb-10">
          <p>
            I'm building{" "}
            {/* ========== CURSOR PILL ========== */}
            <a
              href="https://cursor.com"
              className="group inline-flex items-center pill-bg"
              style={{
                padding: `${PILL_CONFIG.paddingY}px ${PILL_CONFIG.paddingX}px`,
                borderRadius: PILL_CONFIG.borderRadius,
                transform: "translateY(5px)",
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
                  height: "24px",
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
            , the best way to design software with AI.
          </p>
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
                <svg
                  className="pill-icon dark:invert"
                  style={{
                    width: PILL_CONFIG.iconSize,
                    height: PILL_CONFIG.iconSize,
                    '--icon-opacity': PILL_CONFIG.iconOpacity,
                    '--icon-hover-opacity': PILL_CONFIG.iconHoverOpacity,
                  } as React.CSSProperties}
                  viewBox="0 0 28 32"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth={PILL_CONFIG.iconStrokeWidth}
                  aria-hidden="true"
                >
                  <path d="M19.6036 7.51804C17.8575 7.51804 16.5099 8.47898 15.5606 10.7173C12.1622 7.3071 6.79502 4.27195 1.43955 3.86179C0.244238 3.77976 0.0450189 4.70554 0.0215814 5.39695C-0.353419 11.268 4.20518 16.3774 10.0646 17.0454C8.51768 20.4907 6.43174 23.7719 3.53721 26.5141C3.06846 26.9477 3.19736 27.5571 3.49033 27.9907C4.87314 30.1235 9.19736 31.3891 12.1153 30.3813C12.8185 30.1352 12.9356 29.7485 12.9356 29.2094V24.8618C16.1349 24.686 21.1974 22.5766 20.3653 16.0727L20.2481 15.2524C22.6505 14.643 24.2794 13.0844 24.2794 11.5141C24.2794 9.59226 22.1583 7.51804 19.6036 7.51804ZM19.7091 9.20554C21.3849 9.20554 22.5919 10.4243 22.5919 11.5141C22.5919 12.4048 21.4083 13.436 19.1349 13.7524C18.7833 13.7876 18.5255 14.0454 18.5606 14.3735L18.713 16.1196C19.2169 22.143 14.5528 22.9985 11.8341 23.1274C11.4942 23.1391 11.2364 23.3735 11.2364 23.7251V28.8579C11.2364 28.9751 11.1896 29.0688 11.0606 29.0805C8.78721 29.4907 6.31455 28.6704 5.14268 27.4634C5.06064 27.3813 5.02549 27.2524 5.11924 27.1704C8.2833 24.1352 10.4396 20.4555 12.0567 16.5884C12.2794 16.0493 12.0685 15.6157 11.5177 15.5923C5.93955 15.4516 1.75596 11.3501 1.70908 5.8071C1.70908 5.63132 1.74424 5.58445 1.93174 5.60789C6.87705 6.21726 11.5528 9.01804 14.2364 11.7954C14.7169 12.2759 15.0567 12.5219 15.5255 12.5219C16.2872 12.5219 16.6505 12.1469 17.0372 11.3618C17.7169 9.95554 18.3146 9.20554 19.7091 9.20554ZM17.5177 8.90085L19.0997 8.35007C17.4708 4.57664 15.2325 1.97507 12.1856 0.228979C11.2833 -0.286646 10.3692 0.100073 10.1231 1.07273C9.53721 3.20554 9.30283 5.25632 9.58408 7.38914L11.4239 8.25632C11.0021 6.12351 11.0841 4.26023 11.5763 2.26804C11.6114 2.0571 11.8224 1.98679 11.9981 2.09226C14.3653 3.63914 16.1349 5.77195 17.5177 8.90085ZM20.4825 11.8188C20.8692 11.8188 21.1974 11.5024 21.1974 11.104C21.1974 10.7173 20.8692 10.3774 20.4825 10.3774C20.0724 10.3774 19.756 10.7173 19.756 11.104C19.756 11.5024 20.0724 11.8188 20.4825 11.8188ZM22.4396 13.3423L26.7169 13.9516C27.5138 14.0688 27.8888 12.8852 27.0802 12.5454L23.213 10.9048L22.4396 13.3423Z"/>
                </svg>
                <span
                  className="pill-label text-black dark:text-white"
                  style={{
                    fontWeight: PILL_CONFIG.fontWeight,
                    '--label-opacity': PILL_CONFIG.labelOpacity,
                    '--label-hover-opacity': PILL_CONFIG.labelHoverOpacity,
                  } as React.CSSProperties}
                >Follow me</span>
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
                <svg
                  className="pill-icon dark:invert"
                  style={{
                    width: PILL_CONFIG.iconSize,
                    height: PILL_CONFIG.iconSize,
                    '--icon-opacity': PILL_CONFIG.iconOpacity,
                    '--icon-hover-opacity': PILL_CONFIG.iconHoverOpacity,
                  } as React.CSSProperties}
                  viewBox="0 0 29 28"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth={PILL_CONFIG.iconStrokeWidth}
                  aria-hidden="true"
                >
                  <path d="M3.67969 27.1055H24.9492C27.0469 27.1055 28.2773 25.8867 28.2773 23.4844V11.6016C28.2773 9.91406 27.9727 9.09375 26.8008 8.28516L16.4883 1.13672C14.7188 -0.0937503 13.5117 -0.0937503 11.7422 1.13672L1.46484 8.28516C0.304688 9.10547 0 9.91406 0 11.6016V23.4844C0 25.8867 1.24219 27.1055 3.67969 27.1055ZM3.60938 25.3125C2.44922 25.3125 1.79297 24.6797 1.79297 23.4727V11.2852C1.79297 10.4531 1.99219 10.0078 2.57812 9.60938L12.9961 2.41406C13.8281 1.83984 14.4023 1.83984 15.2227 2.41406L25.6992 9.60938C26.2852 9.99609 26.4844 10.4531 26.4844 11.2852V23.4844C26.4844 24.6797 25.8164 25.3125 24.6562 25.3125H3.60938ZM14.1328 14.4023C13.3828 14.4023 12.6562 14.6836 11.9883 15.293L0.960938 25.2188L2.17969 26.4375L13.0078 16.6875C13.3711 16.3594 13.7461 16.207 14.1328 16.207C14.5195 16.207 14.8945 16.3594 15.2578 16.6875L26.0859 26.4375L27.3047 25.2188L16.2773 15.293C15.6094 14.6836 14.8828 14.4023 14.1328 14.4023ZM2.22656 9.01172L1.00781 10.2422L9.32812 18.5625L10.5469 17.3438L2.22656 9.01172ZM26.0625 9L17.7188 17.3438L18.9492 18.5625L27.2812 10.2305L26.0625 9Z"/>
                </svg>
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
                <svg
                  className="pill-icon dark:invert"
                  style={{
                    width: PILL_CONFIG.iconSize,
                    height: PILL_CONFIG.iconSize,
                    '--icon-opacity': PILL_CONFIG.iconOpacity,
                    '--icon-hover-opacity': PILL_CONFIG.iconHoverOpacity,
                  } as React.CSSProperties}
                  viewBox="0 0 30 25"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth={PILL_CONFIG.iconStrokeWidth}
                  aria-hidden="true"
                >
                  <path d="M0 12.1055C0 12.7852 0.386719 13.2656 1.19531 13.3945C2.64844 13.6172 3.22266 14.3555 3.22266 16.2422V19.5352C3.22266 22.7227 4.67578 24.2227 7.83984 24.2227C8.02734 24.2227 8.22656 24.1875 8.36719 24.1406C8.73047 23.9883 8.92969 23.6953 8.92969 23.3086C8.92969 22.8516 8.73047 22.6172 8.32031 22.5117C8.20312 22.4883 8.08594 22.4648 7.94531 22.4531C5.97656 22.3125 5.26172 21.4688 5.26172 19.3008V15.4102C5.26172 13.4297 4.21875 12.3281 2.39062 12.1523C2.35547 12.1523 2.35547 12.1055 2.39062 12.1055C4.21875 11.9297 5.26172 10.8281 5.26172 8.84766V4.94531C5.26172 2.76562 5.97656 1.94531 7.94531 1.80469C8.13281 1.79297 8.29688 1.76953 8.41406 1.72266C8.75391 1.60547 8.92969 1.34766 8.92969 0.9375C8.92969 0.527344 8.71875 0.246094 8.32031 0.105469C8.14453 0.046875 7.95703 0.0234375 7.72266 0.0234375C4.66406 0.0234375 3.22266 1.54688 3.22266 4.71094V8.01562C3.22266 9.87891 2.64844 10.6289 1.19531 10.8516C0.386719 10.9805 0 11.4375 0 12.1055ZM29.4492 12.1055C29.4492 11.4375 29.0508 10.9805 28.2422 10.8516C26.8008 10.6289 26.2148 9.87891 26.2148 8.01562V4.71094C26.2148 1.54688 24.7734 0.0234375 21.7148 0.0234375C21.4805 0.0234375 21.3047 0.046875 21.1289 0.105469C20.7305 0.246094 20.5078 0.527344 20.5078 0.9375C20.5078 1.34766 20.6953 1.60547 21.0352 1.72266C21.1523 1.76953 21.3047 1.79297 21.4922 1.80469C23.4609 1.94531 24.1875 2.76562 24.1875 4.94531V8.84766C24.1875 10.8281 25.2188 11.9297 27.0469 12.1055C27.082 12.1055 27.082 12.1523 27.0469 12.1523C25.2188 12.3281 24.1875 13.4297 24.1875 15.4102V19.3008C24.1875 21.4688 23.4609 22.3125 21.4922 22.4531C21.3516 22.4648 21.2461 22.4883 21.1289 22.5117C20.7188 22.6172 20.5078 22.8516 20.5078 23.3086C20.5078 23.6953 20.7188 23.9883 21.082 24.1406C21.2227 24.1875 21.4102 24.2227 21.5977 24.2227C24.7617 24.2227 26.2148 22.7227 26.2148 19.5352V16.2422C26.2148 14.3555 26.8008 13.6172 28.2422 13.3945C29.0508 13.2656 29.4492 12.7852 29.4492 12.1055Z"/>
                  <path d="M20.1797 13.793C21.1172 13.793 21.8789 13.0312 21.8789 12.1055C21.8789 11.168 21.1172 10.4062 20.1797 10.4062C19.2422 10.4062 18.4805 11.168 18.4805 12.1055C18.4805 13.0312 19.2422 13.793 20.1797 13.793Z"/>
                  <path d="M14.707 13.793C15.6445 13.793 16.4062 13.0312 16.4062 12.1055C16.4062 11.168 15.6445 10.4062 14.707 10.4062C13.7812 10.4062 13.0195 11.168 13.0195 12.1055C13.0195 13.0312 13.7812 13.793 14.707 13.793Z"/>
                  <path d="M9.24609 13.793C10.1836 13.793 10.9453 13.0312 10.9453 12.1055C10.9453 11.168 10.1719 10.4062 9.24609 10.4062C8.30859 10.4062 7.54688 11.168 7.54688 12.1055C7.54688 13.0312 8.30859 13.793 9.24609 13.793Z"/>
                </svg>
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
            {/* Read my thoughts - Coming Soon (disabled pill style) */}
            <li>
              <span
                className="inline-flex items-center"
                style={{
                  gap: PILL_CONFIG.gap,
                  padding: `${PILL_CONFIG.paddingY}px ${PILL_CONFIG.paddingX}px`,
                  fontSize: PILL_CONFIG.fontSize,
                  borderRadius: PILL_CONFIG.borderRadius,
                  cursor: 'not-allowed',
                }}
              >
                <svg
                  className="dark:invert"
                  style={{
                    width: PILL_CONFIG.iconSize,
                    height: PILL_CONFIG.iconSize,
                    opacity: 0.35,
                  }}
                  viewBox="0 0 28 28"
                  fill="currentColor"
                  stroke="currentColor"
                  strokeWidth={PILL_CONFIG.iconStrokeWidth}
                  aria-hidden="true"
                >
                  <path d="M9.10568 26.2031C10.383 26.2031 11.6252 25.5234 12.926 24.5156L13.3362 24.2227L13.758 24.5273C15.0588 25.5234 16.301 26.2031 17.5783 26.2031C18.1408 26.2031 18.7033 26.0742 19.2776 25.793C21.2112 24.8906 21.6799 23.0508 21.7268 20.6719L21.7502 20.2266L22.1135 20.1094C24.4338 19.5352 26.1096 18.668 26.5901 16.5938C27.0705 14.5312 25.9338 12.9844 24.1057 11.4961L22.2541 10.043C21.5979 11.4141 20.5197 13.4531 20.1565 15.0938C19.8869 16.2773 19.8401 17.5078 19.8401 18.7031C18.6682 18.9727 17.4377 19.2891 16.3362 19.8281C15.2932 20.332 14.2854 21.0586 13.3479 21.7969C12.4104 21.0586 11.4143 20.332 10.3596 19.8281C9.24631 19.2891 8.03928 18.9727 6.85568 18.7031C6.85568 17.5078 6.80881 16.2773 6.551 15.082C6.28146 13.9453 5.78928 12.832 5.28537 11.7539C6.23459 10.9922 7.18381 10.1719 7.93381 9.23438C8.69553 8.29688 9.25803 7.20703 9.76193 6.15234C10.9221 6.41016 12.1408 6.63281 13.3479 6.63281C15.3049 6.63281 16.594 6.14062 18.7854 5.69531L17.7776 3.53906C16.758 1.41797 15.4807 0 13.3479 0C11.2268 0 9.99631 1.44141 8.9299 3.53906L8.71896 3.94922L8.25021 3.85547C5.9299 3.36328 4.01975 3.43359 2.69553 5.09766C1.37131 6.76172 1.73459 8.63672 2.71896 10.7578L2.90646 11.2148L2.60178 11.4961C0.773652 12.9844 -0.363067 14.5312 0.105683 16.5938C0.586152 18.668 2.26193 19.5352 4.55881 20.1094L4.94553 20.2266L4.96896 20.6719C5.01584 23.0508 5.48459 24.8906 7.41818 25.793C7.9924 26.0742 8.5549 26.2031 9.10568 26.2031ZM16.1252 4.40625C15.2229 4.59375 14.2971 4.74609 13.3479 4.74609C12.3987 4.74609 11.4729 4.59375 10.5705 4.40625L10.7346 4.13672C11.3557 2.95312 12.0002 1.88672 13.3479 1.88672C14.7072 1.88672 15.3401 2.95312 15.9612 4.13672L16.1252 4.40625ZM7.92209 5.69531C7.51193 6.50391 7.0549 7.3125 6.46896 8.05078C5.87131 8.80078 5.16818 9.44531 4.44162 10.0312L4.301 9.69141C3.79709 8.48438 3.32834 7.3125 4.16037 6.28125C5.01584 5.23828 6.24631 5.37891 7.57053 5.63672L7.92209 5.69531ZM3.77365 12.9375C4.14865 13.7578 4.50021 14.625 4.71115 15.5156C4.92209 16.4414 4.98068 17.3789 4.98068 18.293L4.45334 18.1523C3.25803 17.8359 2.22678 17.4023 1.94553 16.1719C1.66428 14.918 2.46115 14.0625 3.42209 13.2422L3.77365 12.9375ZM6.83225 20.6133C7.74631 20.8359 8.66037 21.0938 9.52756 21.5156C10.3596 21.9141 11.1213 22.4531 11.8479 23.0039L11.5315 23.2383C10.4885 24.0352 9.43381 24.6797 8.22678 24.1172C7.03146 23.543 6.89084 22.3008 6.85568 20.9766L6.83225 20.6133ZM14.8479 23.0039C15.5744 22.4531 16.3479 21.9141 17.1682 21.5156C18.0354 21.0938 18.9612 20.8359 19.8635 20.6133L19.8401 20.9531C19.8049 22.2773 19.676 23.5312 18.469 24.1172C17.2619 24.6797 16.219 24.0117 15.176 23.2383L14.8479 23.0039ZM21.7151 18.293C21.7151 17.3789 21.7854 16.4297 21.9846 15.5039C22.1838 14.6133 22.5354 13.7578 22.9221 12.9375L23.1447 13.1484C24.1643 14.0039 25.0432 14.8594 24.7502 16.1719C24.4455 17.4844 23.2737 17.9062 21.9963 18.2109L21.7151 18.293Z"/>
                  <path d="M12.5275 15.8088L24.1407 6.4924L22.5939 4.57052L10.9923 13.8752L9.79697 15.9963C9.66806 16.219 9.89072 16.5119 10.1486 16.4533L12.5275 15.8088ZM25.0782 5.7424L26.1095 4.92209C26.6017 4.52365 26.6837 3.8674 26.2853 3.38693L26.0157 3.09396C25.6525 2.67209 25.0196 2.60177 24.5626 2.97677L23.5314 3.82052L25.0782 5.7424Z"/>
                </svg>
                <span className="text-black/35 dark:text-white/35">Read my thoughts</span>
                <span className="text-[12px] font-medium tracking-wide uppercase text-black/30 dark:text-white/40 bg-black/[0.03] dark:bg-white/[0.06] px-2 py-1 rounded-full leading-none flex items-center">
                  Soon
                </span>
              </span>
            </li>
          </ul>
        </div>
      </main>

      {/* Experiment section - hidden when ?reference=true, positioned at bottom */}
      <Suspense fallback={null}>
        <ExperimentalModes />
      </Suspense>
    </div>
  );
}
