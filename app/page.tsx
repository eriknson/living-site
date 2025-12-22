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
    <p className="text-[14px] text-black/50 dark:text-white/50 leading-relaxed max-w-[580px] mx-auto px-6 pb-12">
      This site has two experimental modes:{" "}
      <Link
        href="/agent"
        className="font-mono text-[14px] px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.06] text-black/70 dark:text-white/70 hover:bg-black/[0.08] dark:hover:bg-white/[0.1] hover:text-black/90 dark:hover:text-white/90 transition-colors"
      >
        /agent
      </Link>{" "}
      <span className="md:hidden"><br /></span>
      shows daily versions built by Cursor CLI on GitHub Actions,{" "}
      <span className="md:hidden"><br /></span>
      and{" "}
      <Link
        href="/new"
        className="font-mono text-[14px] px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.06] text-black/70 dark:text-white/70 hover:bg-black/[0.08] dark:hover:bg-white/[0.1] hover:text-black/90 dark:hover:text-white/90 transition-colors"
      >
        /new
      </Link>{" "}
      builds a version ad-hoc.
    </p>
  );
}

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
        <div className="space-y-5 text-[17px] leading-relaxed text-black/70 dark:text-white/70 mb-10">
          <p>
            Erik is building{" "}
            <a
              href="https://cursor.com"
              className="text-black/90 dark:text-white/90 underline underline-offset-3 decoration-black/30 dark:decoration-white/30 hover:decoration-black/60 dark:hover:decoration-white/60 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Cursor
            </a>
            , the best way to design software with AI.
          </p>
          <ul className="space-y-2 list-none">
            <li>
              <a
                href="https://x.com/flowstated"
                className="text-black/90 dark:text-white/90 underline underline-offset-3 decoration-black/30 dark:decoration-white/30 hover:decoration-black/60 dark:hover:decoration-white/60 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Follow me on X
              </a>
            </li>
            <li>
              <a
                href="mailto:contact@eriks.design"
                className="text-black/90 dark:text-white/90 underline underline-offset-3 decoration-black/30 dark:decoration-white/30 hover:decoration-black/60 dark:hover:decoration-white/60 transition-colors"
              >
                Send me an email
              </a>
            </li>
            <li>
              <a
                href="https://github.com/eriknson"
                className="text-black/90 dark:text-white/90 underline underline-offset-3 decoration-black/30 dark:decoration-white/30 hover:decoration-black/60 dark:hover:decoration-white/60 transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                Checkout my GitHub
              </a>
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
