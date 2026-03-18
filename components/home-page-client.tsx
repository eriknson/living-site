"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "motion/react";
import { GlobalMenuBar } from "@/components/global-menu-bar";
import { PostList } from "@/components/post-list";
import type { PostMeta } from "@/lib/posts";

const smoothEase = [0.25, 0.1, 0.25, 1] as const;

function formatUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^mailto:/, "")
    .replace(/\/$/, "");
}

function useHasHover() {
  const [hasHover, setHasHover] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    setHasHover(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setHasHover(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return hasHover;
}

function LinkTooltipProvider({ children }: { children: React.ReactNode }) {
  const [tooltip, setTooltip] = useState<{ url: string; x: number; y: number } | null>(null);
  const hasHover = useHasHover();

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest("a[href]") as HTMLAnchorElement | null;

    if (anchor?.href) {
      setTooltip({ url: formatUrl(anchor.href), x: e.clientX, y: e.clientY });
      return;
    }

    setTooltip(null);
  }, []);

  if (!hasHover) {
    return <>{children}</>;
  }

  return (
    <div onMouseMove={handleMouseMove} onMouseLeave={() => setTooltip(null)}>
      {children}
      {tooltip && (
        <div
          className="fixed pointer-events-none z-50 -translate-x-1/2 border border-[var(--color-border-strong)] bg-[var(--color-bg)] px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text)] shadow-[0_12px_40px_rgba(0,0,0,0.12)] backdrop-blur-sm"
          style={{
            left: tooltip.x,
            top: tooltip.y + 24,
          }}
        >
          {tooltip.url}
        </div>
      )}
    </div>
  );
}

function Link({
  href,
  children,
  external = false,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      className={`swiss-link ${external ? "cursor-ne-resize" : ""}`}
      {...(external && { target: "_blank", rel: "noopener noreferrer" })}
    >
      {children}
    </a>
  );
}

function ContactItem({
  label,
  href,
  external = false,
}: {
  label: string;
  href: string;
  external?: boolean;
}) {
  return (
    <li className="swiss-grid border-t border-[var(--color-border)] py-3">
      <span className="swiss-meta">Link</span>
      <a
        href={href}
        className="group flex items-center justify-between gap-4 text-base font-medium text-[var(--color-text)] transition-colors hover:text-[var(--color-accent)]"
        {...(external && { target: "_blank", rel: "noopener noreferrer" })}
      >
        <span>{label}</span>
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-muted)] transition-colors group-hover:text-[var(--color-accent)]">
          {external ? "Open" : "Write"}
        </span>
      </a>
    </li>
  );
}

export function HomePageClient({ posts }: { posts: PostMeta[] }) {
  return (
    <LinkTooltipProvider>
      <div className="site-shell flex flex-col">
        <div className="sticky top-0 z-50">
          <GlobalMenuBar currentRoute="/" />
        </div>

        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: smoothEase }}
          className="flex-1"
        >
          <div className="site-container py-10 sm:py-14">
            <section className="swiss-grid border-t border-[var(--color-border-strong)] pt-5 sm:pt-8">
              <div className="space-y-4">
                <span className="swiss-kicker">Erik Nilsson</span>
                <div className="swiss-meta space-y-1">
                  <p>Stockholm / Product design</p>
                  <p>Independent experiments on interface systems, AI, and writing.</p>
                </div>
              </div>

              <div className="site-column">
                <h1 className="swiss-display max-w-[10ch]">
                  More signal,
                  <br />
                  less ornament.
                </h1>

                <div className="mt-8 max-w-[42rem] space-y-6">
                  <p className="swiss-lead">
                    Hej, I&apos;m Erik. I design products and prototype interactions with a bias toward
                    clarity, tension, and useful constraints.
                  </p>

                  <p className="text-[15px] leading-7 text-[color:color-mix(in_srgb,var(--color-text)_84%,transparent)]">
                    This site is a running archive for thoughts, experiments, and work in progress.
                    I currently build tools for software teams at{" "}
                    <Link href="https://cursor.com" external>
                      Cursor
                    </Link>
                    . Elsewhere, you can follow shorter notes on{" "}
                    <Link href="https://x.com/flowstated" external>
                      X
                    </Link>
                    , browse code on{" "}
                    <Link href="https://github.com/[REDACTED]" external>
                      GitHub
                    </Link>
                    , or send an{" "}
                    <Link href="mailto:contact@eriks.design?subject=Hej">email</Link>.
                  </p>
                </div>
              </div>
            </section>

            <section className="mt-16 sm:mt-24">
              <div className="swiss-grid border-t border-[var(--color-border-strong)] pt-5 sm:pt-6">
                <div className="space-y-3">
                  <span className="swiss-kicker">Links</span>
                  <p className="swiss-meta">Selected ways to keep in touch.</p>
                </div>

                <div className="site-column">
                  <ul className="m-0 list-none p-0">
                    <ContactItem label="Follow on X" href="https://x.com/flowstated" external />
                    <ContactItem
                      label="Browse GitHub"
                      href="https://github.com/[REDACTED]"
                      external
                    />
                    <ContactItem
                      label="Send an email"
                      href="mailto:contact@eriks.design?subject=Hej"
                    />
                  </ul>
                </div>
              </div>
            </section>

            {posts.length > 0 && (
              <section className="mt-16 sm:mt-24">
                <div className="swiss-grid border-t border-[var(--color-border-strong)] pt-5 sm:pt-6">
                  <div className="space-y-3">
                    <span className="swiss-kicker">Archive</span>
                    <p className="swiss-meta">Recent writing and references.</p>
                  </div>

                  <div className="site-column">
                    <PostList posts={posts} />
                  </div>
                </div>
              </section>
            )}
          </div>
        </motion.main>
      </div>
    </LinkTooltipProvider>
  );
}
