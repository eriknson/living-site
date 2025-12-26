"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { GlobalMenuBar } from "@/components/global-menu-bar";

interface Post {
  slug: string;
  title: string;
  publishedAt: string;
  readTime: number;
  content: string;
  contentHtml: string;
}

const smoothEase = [0.25, 0.1, 0.25, 1] as const;

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function PostPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    
    fetch(`/api/posts/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        setPost(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-dvh flex flex-col bg-[#fafaf9] dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-[#e5e5e5]">
        <GlobalMenuBar currentRoute="/" />
        <div className="flex-1 flex items-center justify-center">
          <span className="text-black/50 dark:text-white/50">Loading...</span>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-dvh flex flex-col bg-[#fafaf9] dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-[#e5e5e5]">
        <GlobalMenuBar currentRoute="/" />
        <div className="flex-1 flex items-center justify-center flex-col gap-4">
          <span className="text-black/50 dark:text-white/50">Post not found</span>
          <Link href="/posts" className="text-blue-600 dark:text-blue-400 underline">
            Back to posts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[#fafaf9] dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-[#e5e5e5]">
      <GlobalMenuBar currentRoute="/" />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: smoothEase }}
        className="flex-1"
      >
        {/* Back link */}
        <div className="max-w-[640px] mx-auto px-6 pt-8">
          <Link
            href="/posts"
            className="inline-flex items-center gap-1.5 text-[15px] text-black/50 dark:text-white/50 hover:text-black/80 dark:hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to posts
          </Link>
        </div>

        {/* Article */}
        <article className="max-w-[640px] mx-auto px-6 pt-12 pb-24">
          {/* Header */}
          <header className="mb-12">
            <h1 className="text-3xl md:text-4xl font-medium tracking-tight mb-4">
              {post.title}
            </h1>
            <div className="flex items-center gap-3 text-[15px] text-black/50 dark:text-white/50">
              <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
              <span>·</span>
              <span>{post.readTime} min read</span>
            </div>
          </header>

          {/* Content - rendered from HTML 
              Note: dangerouslySetInnerHTML is safe here because contentHtml comes from 
              our own trusted JSON files in the data/posts/ directory, not user input */}
          <div 
            className="prose prose-gray dark:prose-invert prose-lg max-w-none
              prose-headings:font-medium prose-headings:tracking-tight
              prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6
              prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4
              prose-p:text-[17px] prose-p:leading-[1.8] prose-p:text-black/85 dark:prose-p:text-white/85
              prose-a:text-current prose-a:underline prose-a:decoration-black/20 dark:prose-a:decoration-white/20 prose-a:underline-offset-2 hover:prose-a:decoration-black/40 dark:hover:prose-a:decoration-white/40
              prose-strong:font-semibold
              prose-code:font-mono prose-code:text-[15px] prose-code:bg-black/5 dark:prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
              prose-pre:bg-[#1a1a1a] dark:prose-pre:bg-black/50 prose-pre:border prose-pre:border-black/10 dark:prose-pre:border-white/10 prose-pre:rounded-lg
              prose-img:rounded-lg prose-img:my-8
              prose-figure:my-8
              prose-blockquote:border-l-2 prose-blockquote:border-black/20 dark:prose-blockquote:border-white/20 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-black/70 dark:prose-blockquote:text-white/70
              prose-ul:text-[17px] prose-ul:leading-[1.8]
              prose-ol:text-[17px] prose-ol:leading-[1.8]
              prose-li:text-black/85 dark:prose-li:text-white/85
              prose-hr:border-black/10 dark:prose-hr:border-white/10 prose-hr:my-12"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />
        </article>
      </motion.div>
    </div>
  );
}
