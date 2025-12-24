"use client";

import NextLink from "next/link";
import { motion } from "motion/react";
import { GlobalMenuBar } from "@/components/global-menu-bar";

// Smooth ease for classy feel
const smoothEase = [0.25, 0.1, 0.25, 1] as const;

// Subtle link component - same color as text with underline
function Link({ 
  href, 
  children, 
  external = false 
}: { 
  href: string; 
  children: React.ReactNode; 
  external?: boolean;
}) {
  return (
    <a
      href={href}
      className="underline decoration-black/20 dark:decoration-white/20 underline-offset-2 hover:decoration-black/40 dark:hover:decoration-white/40 transition-colors cursor-ne-resize"
      {...(external && { target: "_blank", rel: "noopener noreferrer" })}
    >
      {children}
    </a>
  );
}

function ExperimentalModes() {
  const pillClass = "font-mono px-1.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-black/35 dark:text-white/35 hover:bg-black/[0.08] dark:hover:bg-white/[0.1] hover:text-black/50 dark:hover:text-white/50 transition-colors";
  
  return (
    <p className="text-[13px] sm:text-[15px] text-black/35 dark:text-white/35 leading-[1.8]">
      This site rebuilds itself with Cursor CLI. {" "}
      <NextLink href="/agent" className={pillClass}>
        /agent
      </NextLink>{" "}
      for today's versions,{" "}
      <NextLink href="/builds" className={pillClass}>
        /builds
      </NextLink>{" "}
      for history, {" "}
      <NextLink href="/new" className={pillClass}>
        /new
      </NextLink>{" "}
      to generate ad-hoc.
    </p>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-dvh flex flex-col bg-[#fafaf9] dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-[#e5e5e5]">
      {/* Menu Bar - stays static during transitions */}
      <GlobalMenuBar currentRoute="/" />

      {/* Animated content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: smoothEase }}
        className="flex-1 flex flex-col"
      >
        {/* Main Content */}
        <main className="max-w-[640px] mx-auto px-6 pt-16 w-full">
          <article className="text-[15px] leading-[1.5] text-black/85 dark:text-white/85 space-y-4">
            <p>
              Hej, I'm Erik.
            </p>

            <p>
              I work on the design team at{" "}
              <Link href="https://cursor.com" external>Cursor</Link>.
            </p>

            <p>
              Previously, I designed and built apps, websites, and identities for global brands at{" "}
              <Link href="https://metamask.io" external>Metamask</Link>,{" "}
              <Link href="https://consensys.io" external>Consensys</Link>,{" "}
              <Link href="https://www.accenture.com/us-en/about/song-client-stories-index" external>Accenture</Link>, and{" "}
              <Link href="https://miltton.com/about/" external>Miltton</Link>.
            </p>

            <p>
              Follow my work on{" "}
              <Link href="https://x.com/flowstated" external>X</Link>,{" "}checkout my{" "}
              <Link href="https://github.com/eriknson" external>GitHub</Link>, or send me an{" "}
              <Link href="mailto:contact@eriks.design">email</Link>.
            </p>
          </article>
        </main>

        {/* Spacer: pushes experimental to bottom on mobile, collapses on desktop */}
        <div className="flex-1 md:flex-none md:h-12" />

        {/* Footer disclaimer */}
        <div className="max-w-[640px] mx-auto px-6 pb-6 w-full">
          <ExperimentalModes />
        </div>
      </motion.div>
    </div>
  );
}
