import { ImageResponse } from "next/og";
import { getPost } from "@/lib/posts";

export const alt = "Post thumbnail";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

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
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#fafaf9",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <span style={{ fontSize: 48, color: "#1a1a1a" }}>Post not found</span>
        </div>
      ),
      { ...size }
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 80,
          backgroundColor: "#fafaf9",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 500,
            color: "#1a1a1a",
            lineHeight: 1.15,
            marginBottom: 32,
            maxWidth: "100%",
          }}
        >
          {post.title}
        </div>

        {/* Meta line */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 28,
            color: "rgba(0, 0, 0, 0.5)",
          }}
        >
          <span>{formatDate(post.publishedAt)}</span>
          <span style={{ opacity: 0.5 }}>·</span>
          <span>{post.readTime} min read</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
