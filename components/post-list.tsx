import Link from "next/link";
import type { PostMeta } from "@/lib/posts";

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

interface PostListProps {
  posts: PostMeta[];
  excludeStaticLink?: boolean;
}

export function PostList({ posts, excludeStaticLink = false }: PostListProps) {
  if (posts.length === 0) return null;

  // Sort by date, newest first
  const sortedPosts = [...posts].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  return (
    <div>
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
                  className="underline underline-offset-2 decoration-black/20 dark:decoration-white/20 hover:decoration-black/40 dark:hover:decoration-white/40 transition-colors truncate cursor-ne-resize"
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
              {post.readTime > 0 && (
                <span className="text-[14px] text-black/35 dark:text-white/35 whitespace-nowrap hidden sm:inline">
                  {post.readTime} min read
                </span>
              )}
            </div>
            <span className="text-[14px] text-black/35 dark:text-white/35 whitespace-nowrap">
              {formatDate(post.publishedAt)}
              {post.readTime > 0 && (
                <span className="sm:hidden"> · {post.readTime} min read</span>
              )}
            </span>
          </li>
        ))}
        {/* Static external link */}
        {!excludeStaticLink && (
          <li className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-4">
            <div className="flex items-baseline gap-3 min-w-0">
              <a
                href="https://uu.diva-portal.org/smash/record.jsf?pid=diva2:1453018"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 decoration-black/20 dark:decoration-white/20 hover:decoration-black/40 dark:hover:decoration-white/40 transition-colors truncate cursor-ne-resize"
              >
                Go with the flow{" "}
                <span className="text-black/35 dark:text-white/35">↗</span>
              </a>
              <span className="text-[14px] text-black/35 dark:text-white/35 whitespace-nowrap hidden sm:inline">
                45 min read
              </span>
            </div>
            <span className="text-[14px] text-black/35 dark:text-white/35 whitespace-nowrap">
              August 4, 2020
              <span className="sm:hidden"> · 45 min read</span>
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}
