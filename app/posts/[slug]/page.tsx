import { notFound } from "next/navigation";
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

  const siteUrl = "https://eriks.design";

  return {
    title: post.title,
    description,
    metadataBase: new URL(siteUrl),
    openGraph: {
      title: post.title,
      description,
      type: "article",
      publishedTime: post.publishedAt,
      authors: ["Erik Nilsson"],
      url: `${siteUrl}/posts/${slug}`,
      images: [
        {
          url: `/posts/${slug}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: `${formattedDate} · ${post.readTime} min read`,
      creator: "@flowstated",
      images: [`/posts/${slug}/opengraph-image`],
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
        <GlobalMenuBar currentRoute="/posts" />
      </div>

      <main className="site-container pb-16 pt-10 sm:pt-14">
        <section className="swiss-grid border-t border-[var(--color-border-strong)] pt-5 sm:pt-8">
          <div className="space-y-4">
            <span className="swiss-kicker">Essay</span>
            <div className="swiss-meta space-y-1">
              <p>{formattedDate}</p>
              {post.readTime && <p>{post.readTime} min read</p>}
            </div>
          </div>

          <div className="site-column">
            <header className="mb-10 border-b border-[var(--color-border)] pb-8">
              <h1 className="max-w-[16ch] text-[clamp(2.5rem,6vw,4.6rem)] font-bold leading-[0.95] tracking-[-0.05em] text-[var(--color-text)]">
                {post.title}
              </h1>
            </header>

            <article
              className="
                swiss-prose prose prose-neutral dark:prose-invert
                prose-headings:font-bold prose-headings:tracking-[-0.04em]
                prose-h2:mt-14 prose-h2:mb-5 prose-h2:text-[1.65rem]
                prose-h3:mt-10 prose-h3:mb-4 prose-h3:text-[1.15rem]
                prose-p:text-[16px] prose-p:leading-8 prose-p:text-[color:color-mix(in_srgb,var(--color-text)_88%,transparent)]
                prose-a:text-[var(--color-text)] prose-a:no-underline
                prose-blockquote:border-l-[3px] prose-blockquote:border-[var(--color-accent)] prose-blockquote:pl-5
                prose-blockquote:text-[color:color-mix(in_srgb,var(--color-text)_82%,transparent)]
                prose-li:text-[15px] prose-li:leading-7 prose-strong:text-[var(--color-text)]
                prose-code:border prose-code:border-[var(--code-border)]
                prose-pre:border prose-pre:border-[var(--code-border)] prose-pre:bg-[var(--code-bg)]
                max-w-none
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
