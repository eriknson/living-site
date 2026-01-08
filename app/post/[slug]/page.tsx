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
    <div className="min-h-dvh bg-[#002FA7] text-white">
      <GlobalMenuBar currentRoute="/" />

      <main className="max-w-[640px] mx-auto px-6 pt-16 pb-16">
        {/* Back link */}
        <Link
          href="/posts"
          className="inline-flex items-center gap-1.5 text-sm text-black/50 dark:text-white/50 hover:text-black/70 dark:hover:text-white/70 transition-colors mb-8"
        >
          <span>←</span>
          <span>Back</span>
        </Link>

        {/* Header */}
        <header className="mb-10">
          <h1 className="text-2xl font-medium mb-3 leading-tight">
            {post.title}
          </h1>
          <p className="text-black/50 dark:text-white/50 text-sm">
            {formattedDate}
            {post.readTime && ` · ${post.readTime} min read`}
          </p>
        </header>

        {/* Article content */}
        <article
          className="
            prose prose-neutral dark:prose-invert
            prose-headings:font-medium prose-headings:tracking-tight
            prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4
            prose-p:text-[15px] prose-p:leading-[1.75] prose-p:text-black/85 dark:prose-p:text-white/85
            prose-a:underline prose-a:decoration-black/20 dark:prose-a:decoration-white/20
            prose-a:underline-offset-2 hover:prose-a:decoration-black/40 dark:hover:prose-a:decoration-white/40
            max-w-none
          "
        >
          <PostContent html={post.contentHtml} />
        </article>

        {/* Related posts */}
        <RelatedPosts posts={allPosts} currentSlug={slug} />
      </main>
    </div>
  );
}
