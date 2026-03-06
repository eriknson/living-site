import type { ReactNode } from "react";
import { GlobalMenuBar } from "@/components/global-menu-bar";
import { PostList } from "@/components/post-list";
import type { Manifest } from "@/lib/manifest";
import type { PostMeta } from "@/lib/posts";

function Link({
  href,
  children,
  external = false,
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      className={`underline decoration-black/20 dark:decoration-white/20 underline-offset-2 hover:decoration-black/40 dark:hover:decoration-white/40 transition-colors ${
        external ? "cursor-ne-resize" : ""
      }`}
      {...(external && { target: "_blank", rel: "noopener noreferrer" })}
    >
      {children}
    </a>
  );
}

interface HomePageProps {
  posts: PostMeta[];
  manifest?: Manifest | null;
  manualVersionDate?: string | null;
}

export function HomePageClient({
  posts,
  manifest = null,
  manualVersionDate = null,
}: HomePageProps) {
  return (
    <div className="min-h-dvh flex flex-col bg-[#fafaf9] dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-[#e5e5e5]">
      <div className="sticky top-0 z-50">
        <GlobalMenuBar
          currentRoute="/"
          manifest={manifest}
          manualVersionDate={manualVersionDate}
        />
      </div>

      <div className="flex-1 flex flex-col">
        <main className="max-w-[640px] mx-auto px-6 pt-16 w-full">
          <article className="text-[15px] leading-[1.5] text-black/85 dark:text-white/85 space-y-4">
            <p>Hej, I'm Erik.</p>

            <p>
              This site is my playground to try things and write about what I
              learn. Follow me on{" "}
              <Link href="https://x.com/flowstated" external>
                X
              </Link>
              , checkout my{" "}
              <Link href="https://github.com/[REDACTED]" external>
                GitHub
              </Link>
              , or send me an{" "}
              <Link href="mailto:contact@eriks.design?subject=Hej">email</Link>.
            </p>
          </article>

          {posts.length > 0 && (
            <div className="mt-12">
              <PostList posts={posts} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
