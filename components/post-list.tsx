import Link from "next/link";
import type { PostMeta } from "@/lib/posts";

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function PostList({ posts }: { posts: PostMeta[] }) {
  if (posts.length === 0) return null;

  // Sort by date, newest first
  const sortedPosts = [...posts].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  return (
    <ul className="space-y-3">
      {sortedPosts.map((post) => (
        <li
          key={post.slug}
          className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-4"
        >
          <div className="flex items-baseline gap-3 min-w-0">
            {post.externalUrl ? (
              <a
                href={post.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 decoration-black/20 dark:decoration-white/20 hover:decoration-black/40 dark:hover:decoration-white/40 transition-colors truncate"
              >
                {post.title}{" "}
                <span className="text-black/35 dark:text-white/35">↗</span>
              </a>
            ) : (
              <Link
                href={`/post/${post.slug}`}
                className="underline underline-offset-2 decoration-black/20 dark:decoration-white/20 hover:decoration-black/40 dark:hover:decoration-white/40 transition-colors"
              >
                {post.title}
              </Link>
            )}
            {post.readTime && (
              <span className="text-black/35 dark:text-white/35 text-sm whitespace-nowrap hidden sm:inline">
                {post.readTime} min read
              </span>
            )}
          </div>
          <span className="text-black/35 dark:text-white/35 text-sm whitespace-nowrap">
            {formatDate(post.publishedAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}
