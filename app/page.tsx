"use client";

import NextLink from "next/link";
import { motion } from "motion/react";
import { GlobalMenuBar } from "@/components/global-menu-bar";

// Animation variants for staggered entry
const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0, 0, 0.2, 1] as const,
    },
  },
};

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
  return (
    <p className="text-[13px] sm:text-[15px] text-black/35 dark:text-white/35 leading-[1.8]">
      This site has two experimental modes to rebuild itself. Explore{" "}
      <NextLink
        href="/agent"
        className="font-mono px-1.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-black/35 dark:text-white/35 hover:bg-black/[0.08] dark:hover:bg-white/[0.1] hover:text-black/50 dark:hover:text-white/50 transition-colors"
      >
        /agent
      </NextLink>{" "}
      for the daily updates, or{" "}
      <NextLink
        href="/new"
        className="font-mono px-1.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-black/35 dark:text-white/35 hover:bg-black/[0.08] dark:hover:bg-white/[0.1] hover:text-black/50 dark:hover:text-white/50 transition-colors"
      >
        /new
      </NextLink>{" "}
      to generate a fresh build on demand.
    </p>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-[#fafaf9] dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-[#e5e5e5]">
      {/* Menu Bar */}
      <GlobalMenuBar currentRoute="/" />

      {/* Main Content */}
      <main className="max-w-[640px] mx-auto px-6 pt-12 w-full">
        <motion.article
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="text-[15px] leading-[1.5] text-black/85 dark:text-white/85 space-y-4"
        >
          <motion.p variants={itemVariants}>
            Hej, I'm Erik.
          </motion.p>

          <motion.p variants={itemVariants}>
            I work on the design team at{" "}
            <Link href="https://cursor.com" external>Cursor</Link>.
          </motion.p>

          <motion.p variants={itemVariants}>
            Previously, I designed products, apps, and identities for global brands at{" "}
            <Link href="https://metamask.io" external>Metamask</Link>,{" "}
            <Link href="https://consensys.io" external>Consensys</Link>,{" "}
            <Link href="https://www.accenture.com/us-en/about/song-client-stories-index" external>Accenture</Link>, and{" "}
            <Link href="https://miltton.com/about/" external>Miltton</Link>.
          </motion.p>

          <motion.p variants={itemVariants}>
            Follow me on{" "}
            <Link href="https://x.com/flowstated" external>X</Link>,{" "}checkout my{" "}
            <Link href="https://github.com/eriknson" external>GitHub</Link>, or reach me via{" "}
            <Link href="mailto:contact@eriks.design">email</Link>.
          </motion.p>
        </motion.article>

        {/* Experimental modes - equal spacing from body as header has from body */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.2,
            ease: [0, 0, 0.2, 1],
            delay: 0.35,
          }}
          className="pt-12 pb-6"
        >
          <ExperimentalModes />
        </motion.div>
      </main>
    </div>
  );
}
