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

// Emil-style row: the whole row is the link, no underline, hover pill
const rowClass =
  "-mx-3 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-4 rounded-md px-3 py-2 no-underline hover:bg-hover transition-colors";

function RowMeta({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-sm text-tertiary whitespace-nowrap">{children}</span>
  );
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
      <ul className="flex flex-col gap-1">
        {sortedPosts.map((post) => (
          <li key={post.slug}>
            {post.externalUrl ? (
              <a
                href={post.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${rowClass} cursor-ne-resize`}
              >
                <span className="flex items-baseline gap-3 min-w-0">
                  <span className="text-primary truncate">
                    {post.title} <span className="text-tertiary">↗</span>
                  </span>
                  {post.readTime > 0 && (
                    <span className="text-sm text-tertiary whitespace-nowrap hidden sm:inline">
                      {post.readTime} min
                    </span>
                  )}
                </span>
                <RowMeta>
                  {formatDate(post.publishedAt)}
                  {post.readTime > 0 && (
                    <span className="sm:hidden"> · {post.readTime} min</span>
                  )}
                </RowMeta>
              </a>
            ) : (
              <Link href={`/posts/${post.slug}`} className={rowClass}>
                <span className="flex items-baseline gap-3 min-w-0">
                  <span className="text-primary truncate">{post.title}</span>
                  {post.readTime > 0 && (
                    <span className="text-sm text-tertiary whitespace-nowrap hidden sm:inline">
                      {post.readTime} min
                    </span>
                  )}
                </span>
                <RowMeta>
                  {formatDate(post.publishedAt)}
                  {post.readTime > 0 && (
                    <span className="sm:hidden"> · {post.readTime} min</span>
                  )}
                </RowMeta>
              </Link>
            )}
          </li>
        ))}
        {/* Static external link */}
        {!excludeStaticLink && (
          <li>
            <a
              href="https://uu.diva-portal.org/smash/record.jsf?pid=diva2:1453018"
              target="_blank"
              rel="noopener noreferrer"
              className={`${rowClass} cursor-ne-resize`}
            >
              <span className="flex items-baseline gap-3 min-w-0">
                <span className="text-primary truncate">
                  Go with the flow <span className="text-tertiary">↗</span>
                </span>
                <span className="text-sm text-tertiary whitespace-nowrap hidden sm:inline">
                  45 min
                </span>
              </span>
              <RowMeta>
                August 4, 2020
                <span className="sm:hidden"> · 45 min</span>
              </RowMeta>
            </a>
          </li>
        )}
      </ul>
    </div>
  );
}
