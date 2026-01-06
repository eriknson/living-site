"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "motion/react";
import { GlobalMenuBar } from "@/components/global-menu-bar";
import { PostList } from "@/components/post-list";
import type { PostMeta } from "@/lib/posts";
import type { MainPageContent } from "@/lib/main-page";

// Smooth ease for classy feel
const smoothEase = [0.25, 0.1, 0.25, 1] as const;

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

export function HomePageClient({ posts, content }: { posts: PostMeta[]; content: MainPageContent }) {
  return (
    <LinkTooltipProvider>
      <div className="min-h-dvh flex flex-col bg-[#fafaf9] dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-[#e5e5e5]">
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
            <article className="text-[15px] leading-[1.5] text-black/85 dark:text-white/85 space-y-4">
              <p>{content.greeting}</p>

              <p>
                {content.bio}{" "}
                <Link href={content.links.x.url} external>
                  {content.links.x.text}
                </Link>
                , checkout my{" "}
                <Link href={content.links.github.url} external>
                  {content.links.github.text}
                </Link>
                {content.bioAfterLinks}{" "}
                <Link href={content.links.email.url}>
                  {content.links.email.text}
                </Link>
                .
              </p>
            </article>

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
