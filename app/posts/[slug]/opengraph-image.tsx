import { ImageResponse } from "next/og";
import { getPost } from "@/lib/posts";

export const alt = "Post thumbnail";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

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
            backgroundColor: "#0a0a0a",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          <span style={{ fontSize: 48, color: "#e5e5e5" }}>Post not found</span>
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
          alignItems: "center",
          justifyContent: "center",
          padding: 80,
          backgroundColor: "#0a0a0a",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Title */}
        <span
          style={{
            fontSize: 72,
            fontWeight: 500,
            color: "#e5e5e5",
            lineHeight: 1.15,
            marginBottom: 24,
            textAlign: "center",
          }}
        >
          {post.title}
        </span>

        {/* Read time */}
        <span
          style={{
            fontSize: 28,
            color: "rgba(255, 255, 255, 0.5)",
          }}
        >
          {post.readTime} min read
        </span>
      </div>
    ),
    { ...size }
  );
}
