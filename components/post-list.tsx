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
      <ul className="m-0 list-none space-y-0 p-0">
        {sortedPosts.map((post) => (
          <li
            key={post.slug}
            className="grid gap-2 border-t border-[var(--color-border)] py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-6"
          >
            <div className="flex min-w-0 items-baseline gap-3">
              {post.externalUrl ? (
                <a
                  href={post.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="swiss-link truncate text-[1.02rem] font-medium leading-tight cursor-ne-resize"
                >
                  {post.title}{" "}
                  <span className="text-[var(--color-muted)]">↗</span>
                </a>
              ) : (
                <Link
                  href={`/posts/${post.slug}`}
                  className="swiss-link text-[1.02rem] font-medium leading-tight"
                >
                  {post.title}
                </Link>
              )}
              {post.readTime && (
                <span className="hidden whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted)] sm:inline">
                  {post.readTime} min read
                </span>
              )}
            </div>
            <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]">
              {formatDate(post.publishedAt)}
              {post.readTime && (
                <span className="sm:hidden"> · {post.readTime} min read</span>
              )}
            </span>
          </li>
        ))}
        {/* Static external link */}
        {!excludeStaticLink && (
          <li className="grid gap-2 border-t border-[var(--color-border)] py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline sm:gap-6">
            <div className="flex min-w-0 items-baseline gap-3">
              <a
                href="https://uu.diva-portal.org/smash/record.jsf?pid=diva2:1453018"
                target="_blank"
                rel="noopener noreferrer"
                className="swiss-link truncate text-[1.02rem] font-medium leading-tight cursor-ne-resize"
              >
                Go with the flow{" "}
                <span className="text-[var(--color-muted)]">↗</span>
              </a>
              <span className="hidden whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted)] sm:inline">
                45 min read
              </span>
            </div>
            <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted)]">
              August 4, 2020
              <span className="sm:hidden"> · 45 min read</span>
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}
