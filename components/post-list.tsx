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

interface PostListProps {
  posts: PostMeta[];
  limit?: number;
  showSeeAll?: boolean;
}

export function PostList({ posts, limit, showSeeAll = false }: PostListProps) {
  if (posts.length === 0) return null;

  // Sort by date, newest first
  const sortedPosts = [...posts].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  const displayPosts = limit ? sortedPosts.slice(0, limit) : sortedPosts;
  const hasMore = limit && sortedPosts.length > limit;

  return (
    <div>
      {showSeeAll && (
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-[15px] font-medium text-black/85 dark:text-white/85">
            Writing
          </h2>
          {hasMore && (
            <Link
              href="/posts"
              className="text-[14px] text-black/40 dark:text-white/40 hover:text-black/60 dark:hover:text-white/60 transition-colors"
            >
              See all →
            </Link>
          )}
        </div>
      )}
      <ul className="space-y-3">
        {displayPosts.map((post) => (
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
                href={`/posts/${post.slug}`}
                className="underline underline-offset-2 decoration-black/20 dark:decoration-white/20 hover:decoration-black/40 dark:hover:decoration-white/40 transition-colors"
              >
                {post.title}
              </Link>
            )}
            {post.readTime && (
              <span className="text-[14px] text-black/35 dark:text-white/35 whitespace-nowrap hidden sm:inline">
                {post.readTime} min read
              </span>
            )}
          </div>
          <span className="text-[14px] text-black/35 dark:text-white/35 whitespace-nowrap">
            {formatDate(post.publishedAt)}
            {post.readTime && (
              <span className="sm:hidden"> · {post.readTime} min read</span>
            )}
          </span>
        </li>
      ))}
      </ul>
    </div>
  );
}
