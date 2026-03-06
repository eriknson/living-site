import { GlobalMenuBar } from "@/components/global-menu-bar";
import { PostList } from "@/components/post-list";
import type { PostMeta } from "@/lib/posts";

export function PostsPageClient({ posts }: { posts: PostMeta[] }) {
  return (
    <div className="min-h-dvh flex flex-col bg-[#fafaf9] dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-[#e5e5e5]">
      <div className="sticky top-0 z-50">
        <GlobalMenuBar currentRoute="/posts" />
      </div>

      <div className="flex-1 flex flex-col">
        <main className="max-w-[640px] mx-auto px-6 pt-16 w-full">
          <h1 className="text-2xl font-medium mb-8">Writing</h1>

          {posts.length > 0 ? (
            <PostList posts={posts} />
          ) : (
            <p className="text-black/50 dark:text-white/50">No posts yet.</p>
          )}
        </main>
      </div>
    </div>
  );
}
