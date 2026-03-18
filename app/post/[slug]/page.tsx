import { notFound } from "next/navigation";
import Link from "next/link";
import { getPost, getAllPostSlugs, getAllPosts } from "@/lib/posts";
import { GlobalMenuBar } from "@/components/global-menu-bar";
import { PostContent } from "@/components/post-content";
import { RelatedPosts } from "@/components/related-posts";

// Generate static params for all posts
export function generateStaticParams() {
  const slugs = getAllPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Post not found" };

  const description = post.content.replace(/<[^>]*>/g, "").slice(0, 160);
  const formattedDate = new Date(post.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return {
    title: post.title,
    description,
    openGraph: {
      title: post.title,
      description,
      type: "article",
      publishedTime: post.publishedAt,
      authors: ["Erik Nilsson"],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: `${formattedDate} · ${post.readTime} min read`,
      creator: "@flowstated",
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    notFound();
  }

  const allPosts = getAllPosts();
  const formattedDate = new Date(post.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-dvh bg-white dark:bg-[#0a0a0a] text-[#121212] dark:text-[#e5e5e5]">
      <div className="sticky top-0 z-50">
        <GlobalMenuBar currentRoute="/" />
      </div>

      <main className="max-w-[680px] mx-auto px-6 pt-12 pb-20">
        {/* Back link */}
        <Link
          href="/posts"
          className="inline-flex items-center gap-1.5 text-sm text-black/50 dark:text-white/50 hover:text-black/70 dark:hover:text-white/70 transition-colors mb-8"
        >
          <span>←</span>
          <span>Back</span>
        </Link>

        {/* Header */}
        <header className="mb-0">
          <h1
            className="text-3xl sm:text-4xl md:text-[2.625rem] font-bold leading-[1.15] tracking-tight mb-4"
            style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }}
          >
            {post.title}
          </h1>
          <div className="flex flex-col gap-1 mt-4 mb-6">
            <p className="text-sm text-black/60 dark:text-white/50 tracking-wide">
              By{" "}
              <span className="font-semibold text-black/90 dark:text-white/80">
                Erik Nilsson
              </span>
            </p>
            <p className="text-sm text-black/45 dark:text-white/40">
              {formattedDate}
              {post.readTime && (
                <span className="ml-2 pl-2 border-l border-black/15 dark:border-white/15">
                  {post.readTime} min read
                </span>
              )}
            </p>
          </div>
          <hr className="nyt-rule" />
        </header>

        {/* Article content */}
        <article className="nyt-article mt-8 max-w-none">
          <PostContent html={post.contentHtml} />
        </article>

        {/* Related posts */}
        <RelatedPosts posts={allPosts} currentSlug={slug} />
      </main>
    </div>
  );
}
