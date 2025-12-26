import { createOgImage, ogSize, ogContentType } from "@/lib/og";
import { getPost } from "@/lib/posts";

export const alt = "Post thumbnail";
export const size = ogSize;
export const contentType = ogContentType;

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    return createOgImage("Post not found");
  }

  const subtitle = `${formatDate(post.publishedAt)} · ${post.readTime} min read`;
  return createOgImage(post.title, subtitle);
}
