import { notFound } from "next/navigation";
import Link from "next/link";
import { getPost, getAllPostSlugs } from "@/lib/posts";

// Generate static params for all posts
export function generateStaticParams() {
  const slugs = getAllPostSlugs();
  return slugs.map((slug) => ({ slug }));
}


export default async function ThumbnailPreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-dvh bg-neutral-900 text-white p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium mb-2">OG Image Preview</h1>
            <p className="text-white/50">
              Preview for: <span className="text-white/80">{post.title}</span>
            </p>
          </div>
          <div className="flex gap-4">
            <Link
              href={`/post/${slug}`}
              className="text-sm text-white/50 hover:text-white/80 transition-colors"
            >
              ← Back to post
            </Link>
            <a
              href={`/post/${slug}/opengraph-image`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors"
            >
              Open raw image ↗
            </a>
          </div>
        </div>

        {/* Preview at actual size */}
        <div className="mb-8">
          <p className="text-sm text-white/40 mb-3">Actual size (1200×630)</p>
          <div className="border border-white/10 rounded-lg overflow-hidden inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/post/${slug}/opengraph-image`}
              alt="OG Image preview"
              width={1200}
              height={630}
              className="block"
              style={{ maxWidth: "100%", height: "auto" }}
            />
          </div>
        </div>

        {/* HTML Preview (for tweaking without regenerating) */}
        <div className="mb-8">
          <p className="text-sm text-white/40 mb-3">
            HTML Preview (matches OG image styling)
          </p>
          <div
            className="rounded-lg overflow-hidden border border-white/10"
            style={{ width: 1200, maxWidth: "100%" }}
          >
            <div
              style={{
                width: 1200,
                height: 630,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 80,
                backgroundColor: "#0a0a0a",
                fontFamily: "system-ui, -apple-system, sans-serif",
                transform: "scale(1)",
                transformOrigin: "top left",
              }}
            >
              {/* Title */}
              <div
                style={{
                  fontSize: 72,
                  fontWeight: 500,
                  color: "#e5e5e5",
                  lineHeight: 1.2,
                  marginBottom: 32,
                  textAlign: "center",
                  maxWidth: "90%",
                }}
              >
                {post.title}
              </div>

              {/* Reading time */}
              <div
                style={{
                  fontSize: 36,
                  color: "rgba(255, 255, 255, 0.5)",
                }}
              >
                {post.readTime} min read
              </div>
            </div>
          </div>
        </div>

        {/* Social preview mockups */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Twitter/X card preview */}
          <div>
            <p className="text-sm text-white/40 mb-3">Twitter/X Card</p>
            <div className="bg-black rounded-2xl p-4 border border-white/10">
              <div className="rounded-xl overflow-hidden border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/post/${slug}/opengraph-image`}
                  alt="Twitter preview"
                  width={600}
                  height={315}
                  className="w-full"
                  style={{ aspectRatio: "1200/630", objectFit: "cover" }}
                />
              </div>
              <div className="mt-3 px-1">
                <p className="text-white/50 text-sm">eriks.design</p>
              </div>
            </div>
          </div>

          {/* iMessage preview */}
          <div>
            <p className="text-sm text-white/40 mb-3">iMessage Preview</p>
            <div className="bg-[#1c1c1e] rounded-2xl p-4">
              <div className="bg-[#3b3b3d] rounded-2xl overflow-hidden max-w-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/post/${slug}/opengraph-image`}
                  alt="iMessage preview"
                  className="w-full"
                  style={{ aspectRatio: "1200/630", objectFit: "cover" }}
                />
                <div className="p-3">
                  <p className="text-white text-sm font-medium truncate">
                    {post.title}
                  </p>
                  <p className="text-white/50 text-xs mt-0.5">eriks.design</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* All posts thumbnails */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="text-sm text-white/40 mb-4">All posts</p>
          <div className="flex flex-wrap gap-2">
            {getAllPostSlugs().map((s) => (
              <Link
                key={s}
                href={`/post/${s}/thumbnail`}
                className={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                  s === slug
                    ? "bg-white/20 text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80"
                }`}
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
