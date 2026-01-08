"use client";

import { motion } from "motion/react";
import { GlobalMenuBar } from "@/components/global-menu-bar";
import { PostList } from "@/components/post-list";
import type { PostMeta } from "@/lib/posts";

// Smooth ease for classy feel
const smoothEase = [0.25, 0.1, 0.25, 1] as const;

export function PostsPageClient({ posts }: { posts: PostMeta[] }) {
  return (
    <div className="min-h-dvh flex flex-col bg-[#FFD700] text-black">
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
            <p className="text-black/60">
              No posts yet.
            </p>
          )}
        </main>
      </motion.div>
    </div>
  );
}
