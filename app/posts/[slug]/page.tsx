import { notFound, redirect } from "next/navigation";
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
      description: `${formattedDate} · ${post.readTime} min`,
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

  if (post.externalUrl) {
    redirect(post.externalUrl);
  }

  const allPosts = getAllPosts();
  const formattedDate = new Date(post.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-dvh bg-page text-primary">
      <div className="sticky top-0 z-50">
        <GlobalMenuBar currentRoute="/posts" />
      </div>

      <main className="max-w-[640px] mx-auto px-6 pt-16 pb-16">
        {/* Header - flat title, same size as body (Emil-style) */}
        <header className="mb-10">
          <h1 className="font-medium mb-0.5">
            {post.title}
          </h1>
          <p className="text-sm text-tertiary">
            {formattedDate}
            {post.readTime && ` · ${post.readTime} min`}
          </p>
        </header>

        {/* Article content */}
        <article
          className="
            prose prose-neutral dark:prose-invert
            text-base leading-[1.65]
            prose-headings:text-base prose-headings:font-[550] prose-headings:text-primary
            prose-h2:mt-10 prose-h2:mb-4
            prose-p:text-primary
            prose-a:font-medium prose-a:text-primary prose-a:underline prose-a:decoration-underline prose-a:decoration-[1.5px]
            prose-a:underline-offset-2 hover:prose-a:decoration-tertiary
            prose-strong:text-primary prose-li:text-primary
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
