/**
 * Regenerate Posts Index
 *
 * Scans all markdown files in data/posts/ and regenerates index.json
 * with post metadata. This is useful when editing posts locally or
 * when you need to rebuild the index without fetching from Notion.
 *
 * Usage:
 *   pnpm run format-posts
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import path from "path";
import matter from "gray-matter";
import { calculateReadingTime } from "../lib/post-html-renderer";

const POSTS_DIR = path.join(process.cwd(), "data/posts");

interface PostMeta {
  slug: string;
  title: string;
  publishedAt: string;
  readTime: number;
  status: "published" | "draft";
  externalUrl?: string;
}

/**
 * Parse a markdown file and extract metadata
 */
function parsePostFile(filename: string): PostMeta | null {
  const filePath = path.join(POSTS_DIR, filename);
  const slug = filename.replace(".md", "");

  try {
    const content = readFileSync(filePath, "utf-8");
    const { data, content: body } = matter(content);

    return {
      slug: data.slug || slug,
      title: data.title || "Untitled",
      publishedAt: data.publishedAt || new Date().toISOString().split("T")[0],
      readTime: data.readTime ?? (data.externalUrl ? 0 : calculateReadingTime(body)),
      status: data.status || "draft",
      ...(data.externalUrl && { externalUrl: data.externalUrl }),
    };
  } catch (error) {
    console.error(`  ✗ Error parsing ${filename}:`, error);
    return null;
  }
}

/**
 * Main function
 */
function main() {
  console.log("=== Regenerate Posts Index ===\n");

  if (!existsSync(POSTS_DIR)) {
    console.error(`Error: ${POSTS_DIR} does not exist`);
    process.exit(1);
  }

  // Find all markdown files
  const files = readdirSync(POSTS_DIR).filter(
    (f) => f.endsWith(".md") && !f.startsWith("_")
  );

  if (files.length === 0) {
    console.log("No markdown files found");
    process.exit(0);
  }

  console.log(`Found ${files.length} markdown files\n`);

  // Parse each file
  const posts: PostMeta[] = [];
  for (const file of files) {
    console.log(`Parsing: ${file}`);
    const meta = parsePostFile(file);
    if (meta && meta.status === "published") {
      posts.push(meta);
      console.log(`  ✓ ${meta.title} (${meta.readTime} min)`);
    } else if (meta) {
      console.log(`  ○ ${meta.title} (draft - skipped)`);
    }
  }

  // Sort by date (newest first)
  posts.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  // Write index
  const indexPath = path.join(POSTS_DIR, "index.json");
  const index = { posts };
  writeFileSync(indexPath, JSON.stringify(index, null, 2));

  console.log(`\n✓ Updated: ${indexPath}`);
  console.log(`  ${posts.length} published posts`);
}

main();
