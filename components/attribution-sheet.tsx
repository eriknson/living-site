"use client";

import { useState } from "react";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";

function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline decoration-black/20 dark:decoration-white/20 underline-offset-2 hover:decoration-black/40 dark:hover:decoration-white/40 transition-colors cursor-ne-resize"
    >
      {children}
    </a>
  );
}

export function AttributionSheet() {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          className="text-[13px] text-black/50 dark:text-white/50 hover:text-black/70 dark:hover:text-white/70 transition-colors"
          aria-label="View attribution and license"
        >
          Attribution & License
        </button>
      </DrawerTrigger>
      <DrawerContent aria-label="Attribution and License">
        <div className="max-w-[640px] mx-auto w-full px-6 pb-8">
          <DrawerHeader className="px-0 text-left">
            <DrawerTitle className="text-[17px] font-medium text-black/90 dark:text-white/90">
              Attribution & License
            </DrawerTitle>
            <DrawerDescription className="text-[14px] text-black/60 dark:text-white/60">
              Information about this site and its open source license.
            </DrawerDescription>
          </DrawerHeader>

          <div className="space-y-6 text-[14px] leading-relaxed text-black/80 dark:text-white/80">
            {/* License Section */}
            <section>
              <h3 className="text-[13px] font-medium uppercase tracking-wide text-black/50 dark:text-white/50 mb-2">
                License
              </h3>
              <p>
                This project is released under the{" "}
                <ExternalLink href="https://opensource.org/licenses/MIT">
                  MIT License
                </ExternalLink>
                . You are free to use, modify, and distribute this code.
              </p>
            </section>

            {/* Built With Section */}
            <section>
              <h3 className="text-[13px] font-medium uppercase tracking-wide text-black/50 dark:text-white/50 mb-2">
                Built With
              </h3>
              <ul className="space-y-1.5">
                <li>
                  <ExternalLink href="https://nextjs.org">Next.js</ExternalLink>{" "}
                  — React framework
                </li>
                <li>
                  <ExternalLink href="https://cursor.com">Cursor</ExternalLink>{" "}
                  — AI-powered code editor
                </li>
                <li>
                  <ExternalLink href="https://tailwindcss.com">
                    Tailwind CSS
                  </ExternalLink>{" "}
                  — Styling
                </li>
                <li>
                  <ExternalLink href="https://motion.dev">Motion</ExternalLink>{" "}
                  — Animations
                </li>
                <li>
                  <ExternalLink href="https://vaul.dev">Vaul</ExternalLink> —
                  Drawer component
                </li>
              </ul>
            </section>

            {/* About Section */}
            <section>
              <h3 className="text-[13px] font-medium uppercase tracking-wide text-black/50 dark:text-white/50 mb-2">
                About
              </h3>
              <p>
                A self-regenerating personal website where AI agents rewrite
                parts of the site daily based on real activity data. Built with{" "}
                <ExternalLink href="https://cursor.com/docs/cli">
                  Cursor CLI
                </ExternalLink>{" "}
                running in GitHub Actions.
              </p>
            </section>

            {/* Source Code Section */}
            <section>
              <h3 className="text-[13px] font-medium uppercase tracking-wide text-black/50 dark:text-white/50 mb-2">
                Source Code
              </h3>
              <p>
                View the source code on{" "}
                <ExternalLink href="https://github.com/eriknson/living-site">
                  GitHub
                </ExternalLink>
                .
              </p>
            </section>
          </div>

          <div className="mt-8 pt-4 border-t border-black/10 dark:border-white/10">
            <DrawerClose asChild>
              <button className="w-full py-2.5 text-[14px] font-medium bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors">
                Close
              </button>
            </DrawerClose>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
