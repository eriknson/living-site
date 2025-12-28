/**
 * Deterministic Post Formatter
 *
 * Converts raw markdown files from Notion to the final JSON format.
 * This is a deterministic process - NO agent/AI involved.
 *
 * Input: data/posts/_raw/{slug}.md (markdown with frontmatter)
 * Output: data/posts/{slug}.json (final post format)
 *
 * Usage:
 *   pnpm run format-posts
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import path from "path";
import {
  markdownToHtml,
  calculateReadingTime,
} from "../lib/post-html-renderer";

const RAW_DIR = path.join(process.cwd(), "data/posts/_raw");
const OUTPUT_DIR = path.join(process.cwd(), "data/posts");

// If true, preserve existing posts that have more images than the new version
const PRESERVE_RICHER_CONTENT = true;

interface Frontmatter {
  title: string;
  slug: string;
  publishedAt: string;
  status: "published" | "draft";
  notionPageId?: string;
  externalUrl?: string;
}

interface Post {
  slug: string;
  title: string;
  publishedAt: string;
  readTime: number;
  status: "published" | "draft";
  content: string;
  contentHtml: string;
  notionPageId?: string;
  externalUrl?: string;
}

/**
 * Parse frontmatter from markdown content
 */
function parseFrontmatter(content: string): {
  frontmatter: Frontmatter;
  body: string;
} {
  const lines = content.split("\n");

  if (lines[0].trim() !== "---") {
    throw new Error("Invalid frontmatter: must start with ---");
  }

  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    throw new Error("Invalid frontmatter: no closing ---");
  }

  const frontmatterLines = lines.slice(1, endIndex);
  const frontmatter: Record<string, string> = {};

  for (const line of frontmatterLines) {
    const colonIndex = line.indexOf(":");
    if (colonIndex !== -1) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();

      // Remove surrounding quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      frontmatter[key] = value;
    }
  }

  const body = lines.slice(endIndex + 1).join("\n").trim();

  return {
    frontmatter: {
      title: frontmatter.title || "Untitled",
      slug: frontmatter.slug || "untitled",
      publishedAt: frontmatter.publishedAt || new Date().toISOString().split("T")[0],
      status: frontmatter.status === "published" ? "published" : "draft",
      notionPageId: frontmatter.notionPageId,
      externalUrl: frontmatter.externalUrl,
    },
    body,
  };
}

/**
 * Count images in HTML content
 */
function countImages(html: string): number {
  const matches = html.match(/<img\s/g);
  return matches ? matches.length : 0;
}

/**
 * Check if existing post has richer content (more images) than the new one
 */
function existingIsRicher(slug: string, newHtml: string): { richer: boolean; existingImages: number; newImages: number } {
  const existingPath = path.join(OUTPUT_DIR, `${slug}.json`);
  
  if (!existsSync(existingPath)) {
    return { richer: false, existingImages: 0, newImages: countImages(newHtml) };
  }
  
  try {
    const existing = JSON.parse(readFileSync(existingPath, "utf-8"));
    const existingImages = countImages(existing.contentHtml || "");
    const newImages = countImages(newHtml);
    
    return {
      richer: existingImages > newImages,
      existingImages,
      newImages,
    };
  } catch {
    return { richer: false, existingImages: 0, newImages: countImages(newHtml) };
  }
}

/**
 * Clean up markdown content from Notion quirks
 */
function cleanMarkdown(markdown: string): string {
  let result = markdown;

  // Remove excessive blank lines (keep max 2)
  result = result.replace(/\n{3,}/g, "\n\n");

  // Fix heading spacing
  result = result.replace(/\n(#{1,3}\s)/g, "\n\n$1");

  // Ensure code blocks have proper spacing
  result = result.replace(/\n```/g, "\n\n```");
  result = result.replace(/```\n/g, "```\n\n");

  // Clean up double spaces
  result = result.replace(/ {2,}/g, " ");

  return result.trim();
}

/**
 * Process a single markdown file
 */
function processPost(filename: string): Post | null {
  const inputPath = path.join(RAW_DIR, filename);
  const content = readFileSync(inputPath, "utf-8");

  try {
    const { frontmatter, body } = parseFrontmatter(content);

    // Handle external URL posts (no content)
    if (frontmatter.externalUrl) {
      console.log(`  → External: ${frontmatter.externalUrl}`);
      return {
        slug: frontmatter.slug,
        title: frontmatter.title,
        publishedAt: frontmatter.publishedAt,
        readTime: 0,
        status: frontmatter.status,
        content: "",
        contentHtml: "",
        externalUrl: frontmatter.externalUrl,
        notionPageId: frontmatter.notionPageId,
      };
    }

    // Clean and process markdown
    const cleanedMarkdown = cleanMarkdown(body);

    // Convert to HTML
    const contentHtml = markdownToHtml(cleanedMarkdown);

    // Calculate reading time
    const readTime = calculateReadingTime(cleanedMarkdown);

    const post: Post = {
      slug: frontmatter.slug,
      title: frontmatter.title,
      publishedAt: frontmatter.publishedAt,
      readTime,
      status: frontmatter.status,
      content: cleanedMarkdown,
      contentHtml,
    };

    if (frontmatter.notionPageId) {
      post.notionPageId = frontmatter.notionPageId;
    }

    return post;
  } catch (error) {
    console.error(`  ✗ Error parsing ${filename}:`, error);
    return null;
  }
}

/**
 * Update the posts index
 */
function updateIndex(posts: Post[]): void {
  const publishedPosts = posts.filter((p) => p.status === "published");

  const index = {
    posts: publishedPosts
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      )
      .map((p) => ({
        slug: p.slug,
        title: p.title,
        publishedAt: p.publishedAt,
        readTime: p.readTime,
        status: p.status,
        externalUrl: p.externalUrl,
      })),
  };

  const indexPath = path.join(OUTPUT_DIR, "index.json");
  writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`\nUpdated: ${indexPath}`);
}

/**
 * Main function
 */
function main() {
  console.log("=== Deterministic Post Formatter ===\n");

  if (!existsSync(RAW_DIR)) {
    console.error(`Error: ${RAW_DIR} does not exist`);
    console.error("Run fetch-notion-posts first");
    process.exit(1);
  }

  const files = readdirSync(RAW_DIR).filter(
    (f) => f.endsWith(".md") && !f.startsWith("_")
  );

  if (files.length === 0) {
    console.log("No markdown files found in _raw directory");
    process.exit(0);
  }

  console.log(`Found ${files.length} posts to process\n`);

  const posts: Post[] = [];
  const preserved: string[] = [];

  for (const file of files) {
    console.log(`Processing: ${file}`);
    const post = processPost(file);
    if (post) {
      const outputPath = path.join(OUTPUT_DIR, `${post.slug}.json`);
      
      // Safety check: don't overwrite if existing post has more images
      if (PRESERVE_RICHER_CONTENT && post.contentHtml) {
        const { richer, existingImages, newImages } = existingIsRicher(post.slug, post.contentHtml);
        if (richer) {
          console.log(`  ⚠ PRESERVED: existing has ${existingImages} images, new has ${newImages}`);
          console.log(`    To force update, manually edit Notion or disable PRESERVE_RICHER_CONTENT`);
          preserved.push(post.slug);
          // Load existing post for index
          try {
            const existing = JSON.parse(readFileSync(outputPath, "utf-8"));
            posts.push(existing);
          } catch {
            posts.push(post);
          }
          continue;
        }
      }
      
      // Save individual post JSON
      writeFileSync(outputPath, JSON.stringify(post, null, 2));
      console.log(`  ✓ Saved: ${outputPath}`);
      posts.push(post);
    }
  }
  
  if (preserved.length > 0) {
    console.log(`\n⚠ Preserved ${preserved.length} posts with richer content: ${preserved.join(", ")}`);
  }

  // Update index
  updateIndex(posts);

  console.log("\n=== Formatting Complete ===");
  console.log(`Processed ${posts.length} posts`);
}

main();
