import { readFileSync, existsSync, readdirSync } from "fs";
import path from "path";
import matter from "gray-matter";
import {
  markdownToHtml,
  calculateReadingTime,
} from "./post-html-renderer";

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
 * Get all published posts metadata, sorted by date (newest first)
 * Uses index.json for fast listing without parsing all markdown files
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
 * Reads markdown file, parses frontmatter, and generates HTML
 */
export function getPost(slug: string): Post | null {
  const filePath = path.join(POSTS_DIR, `${slug}.md`);
  if (!existsSync(filePath)) return null;

  const fileContent = readFileSync(filePath, "utf-8");
  const { data, content } = matter(fileContent);

  // Handle external URL posts (no content to render)
  if (data.externalUrl) {
    return {
      slug: data.slug || slug,
      title: data.title || "Untitled",
      publishedAt: data.publishedAt || new Date().toISOString().split("T")[0],
      readTime: 0,
      status: data.status || "draft",
      content: "",
      contentHtml: "",
      externalUrl: data.externalUrl,
      notionPageId: data.notionPageId || null,
    };
  }

  // Generate HTML from markdown at read time
  const contentHtml = markdownToHtml(content);
  const readTime = calculateReadingTime(content);

  return {
    slug: data.slug || slug,
    title: data.title || "Untitled",
    publishedAt: data.publishedAt || new Date().toISOString().split("T")[0],
    readTime,
    status: data.status || "draft",
    content,
    contentHtml,
    notionPageId: data.notionPageId || null,
  };
}

/**
 * Get all post slugs for static generation
 */
export function getAllPostSlugs(): string[] {
  if (!existsSync(POSTS_DIR)) return [];

  return readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith(".md") && !file.startsWith("_"))
    .map((file) => file.replace(".md", ""));
}
