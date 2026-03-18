"use client";

import { motion } from "motion/react";
import { GlobalMenuBar } from "@/components/global-menu-bar";
import { PostList } from "@/components/post-list";
import type { PostMeta } from "@/lib/posts";

// Smooth ease for classy feel
const smoothEase = [0.25, 0.1, 0.25, 1] as const;

export function PostsPageClient({ posts }: { posts: PostMeta[] }) {
  return (
    <div className="site-shell flex min-h-dvh flex-col">
      <div className="sticky top-0 z-50">
        <GlobalMenuBar currentRoute="/posts" />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: smoothEase }}
        className="flex-1"
      >
        <main className="site-container py-10 sm:py-14">
          <section className="swiss-grid border-t border-[var(--color-border-strong)] pt-5 sm:pt-6">
            <div className="space-y-3">
              <span className="swiss-kicker">Writing</span>
              <p className="swiss-meta">Notes, essays, and references.</p>
            </div>

            <div className="site-column">
              <h1 className="swiss-display max-w-[8ch] text-[clamp(2.8rem,8vw,5rem)]">
                Writing as a working archive.
              </h1>

              <p className="mt-6 max-w-[40rem] text-[15px] leading-7 text-[color:color-mix(in_srgb,var(--color-text)_82%,transparent)]">
                A mix of essays, experiments, and longer references. The structure is simple on
                purpose: title, date, reading time, and enough white space to let the material
                carry the page.
              </p>

              <div className="mt-10">
                {posts.length > 0 ? (
                  <PostList posts={posts} />
                ) : (
                  <p className="text-[13px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]">
                    No posts yet.
                  </p>
                )}
              </div>
            </div>
          </section>
        </main>
      </motion.div>
    </div>
  );
}
