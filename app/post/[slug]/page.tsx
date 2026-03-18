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
    <div className="site-shell">
      <div className="sticky top-0 z-50">
        <GlobalMenuBar currentRoute="/" />
      </div>

      <main className="site-container py-10 sm:py-14">
        <section className="swiss-grid border-t border-[var(--color-border-strong)] pt-5 sm:pt-8">
          <div className="space-y-5">
            <Link
              href="/posts"
              className="inline-flex items-center gap-2 swiss-meta transition-colors hover:text-[var(--color-text)]"
            >
              <span aria-hidden="true">←</span>
              <span>Back to archive</span>
            </Link>
            <div className="space-y-2">
              <span className="swiss-kicker">Essay</span>
              <p className="swiss-meta">
                {formattedDate}
                {post.readTime && ` / ${post.readTime} min read`}
              </p>
            </div>
          </div>

          <div className="site-column">
            <header className="border-b border-[var(--color-border)] pb-8">
              <h1 className="max-w-[15ch] text-[clamp(2.6rem,7vw,5.4rem)] font-bold leading-[0.94] tracking-[-0.06em]">
                {post.title}
              </h1>
            </header>

            <article
              className="
                swiss-prose prose prose-neutral max-w-none pt-8 dark:prose-invert
                prose-headings:font-bold prose-headings:tracking-[-0.04em]
                prose-h2:mt-12 prose-h2:mb-4 prose-h2:text-[1.65rem]
                prose-h3:mt-10 prose-h3:mb-3 prose-h3:text-[1.2rem]
                prose-p:text-[16px] prose-p:leading-8
                prose-a:swiss-inline-link
                prose-li:text-[15px] prose-li:leading-7
                prose-blockquote:border-l-[3px] prose-blockquote:border-[var(--color-accent)]
                prose-blockquote:pl-5 prose-blockquote:italic prose-blockquote:text-[var(--color-text)]
              "
            >
              <PostContent html={post.contentHtml} />
            </article>

            <RelatedPosts posts={allPosts} currentSlug={slug} />
          </div>
        </section>
      </main>
    </div>
  );
}
