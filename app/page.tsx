"use client";

import Link from "next/link";
import { GlobalMenuBar } from "@/components/global-menu-bar";

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-[#fafaf9] dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-[#e5e5e5]">
      {/* Menu Bar */}
      <div className="sticky top-0 z-50">
        <GlobalMenuBar currentRoute="/" />
      </div>

      {/* Main Content */}
      <main className="max-w-[580px] mx-auto px-6 py-16 md:py-24">
        {/* Bio paragraphs - conversational style like leerob/anyblockers */}
        <div className="space-y-5 text-[17px] leading-relaxed text-black/70 dark:text-white/70 mb-10">
          <p>
            I'm a product designer building with AI. I believe in simplicity and
            iterating until every detail feels right. Based in Stockholm, Sweden.
          </p>
          <p>
            Currently building{" "}
            <a
              href="https://github.com/eriknson/shipflow"
              className="text-black/90 dark:text-white/90 underline underline-offset-3 decoration-black/30 dark:decoration-white/30 hover:decoration-black/60 dark:hover:decoration-white/60 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              shipflow
            </a>
            , a point-and-click editing layer for Next.js powered by Cursor
            Agent. Also exploring ways to spin up agents from my phone using iOS
            Shortcuts, GitHub Actions, and the Cursor CLI.
          </p>
          <p>
            I share my work on{" "}
            <a
              href="https://x.com/flowstated"
              className="text-black/90 dark:text-white/90 underline underline-offset-3 decoration-black/30 dark:decoration-white/30 hover:decoration-black/60 dark:hover:decoration-white/60 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              X
            </a>
            , push code to{" "}
            <a
              href="https://github.com/eriknson"
              className="text-black/90 dark:text-white/90 underline underline-offset-3 decoration-black/30 dark:decoration-white/30 hover:decoration-black/60 dark:hover:decoration-white/60 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            , and you can also find me on{" "}
            <a
              href="https://linkedin.com/in/eriknson"
              className="text-black/90 dark:text-white/90 underline underline-offset-3 decoration-black/30 dark:decoration-white/30 hover:decoration-black/60 dark:hover:decoration-white/60 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
            .{" "}
            <a
              href="mailto:contact@eriks.design"
              className="text-black/90 dark:text-white/90 underline underline-offset-3 decoration-black/30 dark:decoration-white/30 hover:decoration-black/60 dark:hover:decoration-white/60 transition-colors"
            >
              Say hello
            </a>{" "}
            if you want to chat.
          </p>
        </div>

        {/* Experiment section - subtle, part of the flow */}
        <p className="text-[15px] text-black/50 dark:text-white/50 leading-relaxed">
          This site has two experimental modes:{" "}
          <Link
            href="/agent"
            className="font-mono text-[13px] px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.06] text-black/70 dark:text-white/70 hover:bg-black/[0.08] dark:hover:bg-white/[0.1] hover:text-black/90 dark:hover:text-white/90 transition-colors"
            style={{ fontFamily: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}
          >
            /agent
          </Link>{" "}
          shows daily versions built by Cursor CLI on GitHub Actions, and{" "}
          <Link
            href="/new"
            className="font-mono text-[13px] px-1.5 py-0.5 rounded bg-black/[0.04] dark:bg-white/[0.06] text-black/70 dark:text-white/70 hover:bg-black/[0.08] dark:hover:bg-white/[0.1] hover:text-black/90 dark:hover:text-white/90 transition-colors"
            style={{ fontFamily: "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}
          >
            /new
          </Link>{" "}
          builds a version ad-hoc.
        </p>
      </main>

      {/* Footer */}
      <footer className="max-w-[580px] mx-auto px-6 pb-12 text-[13px] text-black/30 dark:text-white/30">
        <p>© 2025</p>
      </footer>
    </div>
  );
}
