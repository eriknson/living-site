import { createOgImage, ogSize, ogContentType } from "@/lib/og";
import { getPost } from "@/lib/posts";

export const alt = "Post thumbnail";
export const size = ogSize;
export const contentType = ogContentType;

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

  const subtitle = post.readTime ? `${post.readTime} min read` : undefined;
  return createOgImage(post.title, subtitle);
}
