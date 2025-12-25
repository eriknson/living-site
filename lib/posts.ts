import { readFileSync, existsSync, readdirSync } from "fs";
import path from "path";

export type PostMeta = {
  slug: string;
  title: string;
  publishedAt: string;
  readTime: number;
  status: "published" | "draft";
  externalUrl?: string | null;
};

export type Post = PostMeta & {
  content: string;
  contentHtml: string;
  notionPageId?: string | null;
};

const POSTS_DIR = path.join(process.cwd(), "data/posts");

/**
 * Calculate reading time based on word count
 * Average reading speed: 200 words per minute
 */
export function calculateReadingTime(text: string): number {
  // Strip HTML tags if present
  const plainText = text.replace(/<[^>]*>/g, "");
  // Count words (split by whitespace)
  const wordCount = plainText
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
  // Calculate minutes, minimum 1 minute
  return Math.max(1, Math.ceil(wordCount / 200));
}

/**
 * Get all published posts metadata, sorted by date (newest first)
 */
export function getAllPosts(): PostMeta[] {
  const indexPath = path.join(POSTS_DIR, "index.json");
  if (!existsSync(indexPath)) return [];

  const data = JSON.parse(readFileSync(indexPath, "utf-8"));
  return (data.posts as PostMeta[])
    .filter((post) => post.status === "published")
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
}

/**
 * Get a single post by slug
 */
export function getPost(slug: string): Post | null {
  const filePath = path.join(POSTS_DIR, `${slug}.json`);
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

/**
 * Get all post slugs for static generation
 */
export function getAllPostSlugs(): string[] {
  if (!existsSync(POSTS_DIR)) return [];

  return readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith(".json") && file !== "index.json")
    .map((file) => file.replace(".json", ""));
}
