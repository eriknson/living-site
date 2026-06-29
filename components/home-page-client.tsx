"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles } from "lucide-react";
import { GlobalMenuBar } from "@/components/global-menu-bar";
import { PostList } from "@/components/post-list";
import { VibrantDemo } from "@/components/vibrant-demo";
import type { PostMeta } from "@/lib/posts";

// Smooth ease for classy feel
const smoothEase = [0.25, 0.1, 0.25, 1] as const;

const VIBRANT_STORAGE_KEY = "home-vibrant-mode";

// Persisted toggle for the wide-gamut P3 "vibrant" home theme
function useVibrantMode(): [boolean, () => void] {
  const [vibrant, setVibrant] = useState(false);

  useEffect(() => {
    try {
      setVibrant(window.localStorage.getItem(VIBRANT_STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setVibrant((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(VIBRANT_STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return [vibrant, toggle];
}

function VibrantToggle({ vibrant, onToggle }: { vibrant: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-pressed={vibrant}
      className="group inline-flex items-center gap-2 h-8 pl-2.5 pr-3 rounded-full text-[13px] font-medium select-none cursor-pointer transition-colors bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/[0.1]"
      style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
    >
      <Sparkles
        className="h-3.5 w-3.5 transition-colors"
        style={vibrant ? { color: "var(--v-accent)" } : undefined}
      />
      <span className="text-black/70 dark:text-white/70">
        {vibrant ? "Vibrant P3" : "Vibrant mode"}
      </span>
      <span
        className={`relative inline-flex h-[18px] w-[30px] items-center rounded-full transition-colors ${
          vibrant ? "" : "bg-black/15 dark:bg-white/20"
        }`}
        style={vibrant ? { background: "var(--v-accent)" } : undefined}
      >
        <span
          className={`inline-block h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-transform ${
            vibrant ? "translate-x-[14px]" : "translate-x-[2px]"
          }`}
        />
      </span>
    </button>
  );
}

// Strip protocol and trailing slash from URLs
function formatUrl(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/^mailto:/, "")
    .replace(/\/$/, "");
}

// Hook to detect if device has hover capability (desktop)
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

// Cursor-following link tooltip (desktop only)
function LinkTooltipProvider({ children }: { children: React.ReactNode }) {
  const [tooltip, setTooltip] = useState<{ url: string; x: number; y: number } | null>(null);
  const hasHover = useHasHover();

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
    
    if (anchor) {
      const href = anchor.getAttribute("href");
      if (href) {
        // Always show the full URL without protocol
        const displayUrl = formatUrl(anchor.href);
        setTooltip({ url: displayUrl, x: e.clientX, y: e.clientY });
        return;
      }
    }
    // Clear if not over a link
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
          className="fixed pointer-events-none z-50 px-2.5 py-1.5 text-[15px] bg-black/80 dark:bg-white/90 text-white dark:text-black rounded-md shadow-lg backdrop-blur-sm -translate-x-1/2"
          style={{
            left: tooltip.x,
            top: tooltip.y + 20,
          }}
        >
          {tooltip.url}
        </div>
      )}
    </div>
  );
}

// Subtle link component - same color as text with underline
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
      className={`underline decoration-black/20 dark:decoration-white/20 underline-offset-2 hover:decoration-black/40 dark:hover:decoration-white/40 transition-colors ${external ? "cursor-ne-resize" : ""}`}
      {...(external && { target: "_blank", rel: "noopener noreferrer" })}
    >
      {children}
    </a>
  );
}

export function HomePageClient({ posts }: { posts: PostMeta[] }) {
  const [vibrant, toggleVibrant] = useVibrantMode();

  return (
    <LinkTooltipProvider>
      <div
        className={`min-h-dvh flex flex-col bg-[#fafaf9] dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-[#e5e5e5] ${
          vibrant ? "vibrant-home" : ""
        }`}
      >
        {/* Menu Bar - fixed at top */}
        <div className="sticky top-0 z-50">
          <GlobalMenuBar currentRoute="/" />
        </div>

        {/* Animated content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: smoothEase }}
          className="flex-1 flex flex-col"
        >
          {/* Main Content */}
          <main className="max-w-[640px] mx-auto px-6 pt-16 w-full">
            <div className="flex justify-end mb-6">
              <VibrantToggle vibrant={vibrant} onToggle={toggleVibrant} />
            </div>

            <article className="text-[15px] leading-[1.5] text-black/85 dark:text-white/85 space-y-4">
              <p className={vibrant ? "vibrant-heading text-[22px] leading-tight" : undefined}>
                Hej, I'm Erik.
              </p>

              <p>
                This site is my playground to try things and write about what I learn. Follow me on{" "}
                <Link href="https://x.com/flowstated" external>
                  X
                </Link>
                , checkout my{" "}
                <Link href="https://github.com/eriknson" external>
                  GitHub
                </Link>
                , or send me an{" "}
                <Link href="mailto:contact@eriks.design?subject=Hej">email</Link>.
              </p>
            </article>

            <AnimatePresence initial={false}>
              {vibrant && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: smoothEase }}
                  className="overflow-hidden"
                >
                  <VibrantDemo />
                </motion.div>
              )}
            </AnimatePresence>

            {posts.length > 0 && (
              <div className="mt-12">
                <PostList posts={posts} />
              </div>
            )}
          </main>
        </motion.div>
      </div>
    </LinkTooltipProvider>
  );
}
