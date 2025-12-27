"use client";

import { motion } from "motion/react";
import NextLink from "next/link";
import { GlobalMenuBar } from "@/components/global-menu-bar";
import { PostList } from "@/components/post-list";
import type { PostMeta } from "@/lib/posts";

// Smooth ease for classy feel
const smoothEase = [0.25, 0.1, 0.25, 1] as const;

function ExperimentalModes() {
  const pillClass =
    "font-mono px-1.5 py-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-black/35 dark:text-white/35 hover:bg-black/[0.08] dark:hover:bg-white/[0.1] hover:text-black/50 dark:hover:text-white/50 transition-colors";

  return (
    <p className="text-[15px] text-black/35 dark:text-white/35 leading-[1.8]">
      This site rebuilds itself with Cursor CLI.{" "}
      <NextLink href="/agent" className={pillClass}>
        /agent
      </NextLink>{" "}
      for today's versions,{" "}
      <NextLink href="/builds" className={pillClass}>
        /builds
      </NextLink>{" "}
      for history,{" "}
      <NextLink href="/new" className={pillClass}>
        /new
      </NextLink>{" "}
      to generate ad-hoc.
    </p>
  );
}

export function PostsPageClient({ posts }: { posts: PostMeta[] }) {
  return (
    <div className="min-h-dvh flex flex-col bg-[#fafaf9] dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-[#e5e5e5]">
      {/* Menu Bar - fixed at top */}
      <div className="sticky top-0 z-50">
        <GlobalMenuBar currentRoute="/posts" />
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
          <h1 className="text-2xl font-medium mb-8">Writing</h1>
          
          {posts.length > 0 ? (
            <PostList posts={posts} />
          ) : (
            <p className="text-black/50 dark:text-white/50">
              No posts yet.
            </p>
          )}
        </main>

        {/* Spacer: pushes footer to bottom on mobile, collapses on desktop */}
        <div className="flex-1 md:flex-none md:h-12" />

        {/* Footer disclaimer */}
        <div className="max-w-[640px] mx-auto px-6 pb-6 w-full">
          <ExperimentalModes />
        </div>
      </motion.div>
    </div>
  );
}
