/**
 * Fetch posts from Notion and save as markdown files
 *
 * This script:
 * 1. Fetches all pages from the Posts database
 * 2. Converts each page to markdown using notion-to-md
 * 3. Downloads images (Notion URLs expire)
 * 4. Saves markdown files directly to data/posts/{slug}.md
 * 5. Updates index.json with post metadata
 *
 * Usage:
 *   NOTION_TOKEN=secret_xxx NOTION_DATABASE_ID=xxx pnpm run fetch-notion-posts
 */

import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import {
  writeFileSync,
  readFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
} from "fs";
import path from "path";
import { calculateReadingTime } from "../../lib/post-html-renderer";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });
const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
  console.error(
    "Missing NOTION_TOKEN or NOTION_DATABASE_ID environment variables"
  );
  process.exit(1);
}

const POSTS_DIR = path.join(process.cwd(), "data/posts");
const IMAGES_DIR = path.join(process.cwd(), "public/posts");

interface NotionPost {
  id: string;
  title: string;
  slug: string;
  publishedAt: string;
  status: "published" | "draft";
  externalUrl?: string;
}

/**
 * Custom transformer for bookmark blocks
 * Converts X/Twitter bookmarks to <tweet> embeds
 */
n2m.setCustomTransformer("bookmark", async (block: any) => {
  const url = block.bookmark?.url || "";
  if (url.includes("x.com/") || url.includes("twitter.com/")) {
    return `<tweet>${url}</tweet>`;
  }
  // Regular bookmark - just return as link
  const caption = block.bookmark?.caption?.[0]?.plain_text || url;
  return `[${caption}](${url})`;
});

/**
 * Custom transformer for embed blocks
 */
n2m.setCustomTransformer("embed", async (block: any) => {
  const url = block.embed?.url || "";
  if (url.includes("x.com/") || url.includes("twitter.com/")) {
    return `<tweet>${url}</tweet>`;
  }
  return `[Embed: ${url}](${url})`;
});

/**
 * Extract post metadata from a Notion page object
 */
function extractPostFromPage(page: any): NotionPost {
  const props = page.properties;

  // Get title - it's usually the first property or named "Title" or "Name"
  const titleProp = props.Title || props.title || props.Name || props.name;
  const title =
    titleProp?.title?.[0]?.plain_text ||
    titleProp?.rich_text?.[0]?.plain_text ||
    "Untitled";

  // Get slug
  const slugProp = props.Slug || props.slug;
  const slug =
    slugProp?.rich_text?.[0]?.plain_text ||
    title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  // Get published date
  const publishedProp = props.Published || props.published || props.Date;
  const publishedAt =
    publishedProp?.date?.start || new Date().toISOString().split("T")[0];

  // Get status
  const statusProp = props.Status || props.status;
  const statusValue = statusProp?.select?.name || "Draft";
  const status =
    statusValue.toLowerCase() === "published" ? "published" : "draft";

  // Get external URL
  const externalUrlProp = props["External URL"] || props.externalUrl;
  const externalUrl = externalUrlProp?.url || undefined;

  return {
    id: page.id,
    title,
    slug,
    publishedAt,
    status,
    externalUrl,
  };
}

/**
 * Fetch all posts from Notion database
 */
async function fetchPostsFromNotion(): Promise<NotionPost[]> {
  console.log("Fetching posts from Notion...");

  const posts: NotionPost[] = [];
  let cursor: string | undefined;

  do {
    const response: any = await notion.databases.query({
      database_id: DATABASE_ID,
      start_cursor: cursor,
      sorts: [{ property: "Published", direction: "descending" }],
    });

    for (const page of response.results) {
      posts.push(extractPostFromPage(page));
    }

    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  console.log(`Found ${posts.length} posts`);
  return posts;
}

/**
 * Download an image from URL and save locally
 */
async function downloadImage(
  url: string,
  slug: string,
  index: number
): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`  Failed to download image: ${url}`);
      return url; // Return original URL as fallback
    }

    const contentType = response.headers.get("content-type") || "";
    let ext = "jpg";
    if (contentType.includes("png")) ext = "png";
    else if (contentType.includes("gif")) ext = "gif";
    else if (contentType.includes("webp")) ext = "webp";
    else if (contentType.includes("svg")) ext = "svg";

    const buffer = Buffer.from(await response.arrayBuffer());
    const filename = `notion-image-${index}.${ext}`;
    const imageDir = path.join(IMAGES_DIR, slug);

    if (!existsSync(imageDir)) {
      mkdirSync(imageDir, { recursive: true });
    }

    const localPath = path.join(imageDir, filename);
    writeFileSync(localPath, buffer);

    return `/posts/${slug}/${filename}`;
  } catch (error) {
    console.error(`  Error downloading image: ${error}`);
    return url;
  }
}

/**
 * Process markdown to handle images:
 * 1. Download Notion-hosted images to local
 * 2. Convert eriks.design absolute URLs to relative paths
 */
async function processImages(
  markdown: string,
  slug: string
): Promise<string> {
  let result = markdown;

  // 1. Convert eriks.design absolute URLs to relative paths
  // This handles the roundtrip from export → Notion → sync
  result = result.replace(
    /!\[([^\]]*)\]\(https:\/\/eriks\.design(\/posts\/[^)]+)\)/g,
    "![$1]($2)"
  );

  // 2. Match and download Notion-hosted images
  const notionImageRegex =
    /!\[([^\]]*)\]\((https:\/\/(?:prod-files-secure\.s3\.us-west-2\.amazonaws\.com|s3\.us-west-2\.amazonaws\.com\/secure\.notion-static\.com)[^)]+)\)/g;

  let match;
  let imageIndex = 0;

  // Collect all matches first (regex is stateful)
  const matches: { full: string; alt: string; url: string }[] = [];
  while ((match = notionImageRegex.exec(result)) !== null) {
    matches.push({ full: match[0], alt: match[1], url: match[2] });
  }

  // Download each Notion-hosted image
  for (const m of matches) {
    const localPath = await downloadImage(m.url, slug, imageIndex++);
    result = result.replace(m.full, `![${m.alt}](${localPath})`);
  }

  return result;
}

/**
 * Clean up markdown content
 * IMPORTANT: Preserves code block formatting exactly (for ASCII art, etc.)
 */
function cleanMarkdown(markdown: string): string {
  // First, fix malformed code blocks from notion-to-md
  // It outputs: ```\n\nlanguage\ncode\n``` instead of ```language\ncode\n```
  let result = markdown;
  
  // Fix code blocks where language is on a separate line after blank line(s)
  // Pattern: ``` followed by newlines, then a language identifier, then actual code
  result = result.replace(
    /```\s*\n\s*\n(bash|javascript|typescript|yaml|markdown|python|json|html|css|sh|shell|ts|js)\n/g,
    "```$1\n"
  );
  
  // Also handle case where there's just one newline before language
  result = result.replace(
    /```\s*\n(bash|javascript|typescript|yaml|markdown|python|json|html|css|sh|shell|ts|js)\n/g,
    "```$1\n"
  );

  // Split content into code blocks and non-code blocks
  // We preserve code blocks exactly as-is
  const codeBlockRegex = /(```[\s\S]*?```)/g;
  const parts = result.split(codeBlockRegex);

  const processed = parts.map((part, index) => {
    // Odd indices are code blocks (captured groups)
    const isCodeBlock = index % 2 === 1;
    if (isCodeBlock) {
      // Preserve code blocks exactly as-is
      return part;
    }

    // Process non-code-block content
    let r = part;

    // Remove excessive blank lines (keep max 2)
    r = r.replace(/\n{3,}/g, "\n\n");

    // Fix heading spacing
    r = r.replace(/\n(#{1,3}\s)/g, "\n\n$1");

    // Clean up double spaces (but NOT in code blocks - they're preserved above)
    r = r.replace(/ {2,}/g, " ");

    return r;
  });

  result = processed.join("");

  // Ensure code blocks have proper spacing (before and after)
  result = result.replace(/([^\n])(```)/g, "$1\n\n$2");
  result = result.replace(/(```[^\n]*\n[\s\S]*?```)\n?([^\n])/g, "$1\n\n$2");

  return result.trim();
}

/**
 * Fetch and save a single post
 */
async function fetchPost(post: NotionPost): Promise<string | null> {
  console.log(`\nProcessing: ${post.title}`);

  // Skip external posts
  if (post.externalUrl) {
    console.log("  (external URL - skipping content fetch)");

    // Still create a placeholder file for external posts
    const frontmatter = `---
title: "${post.title}"
slug: "${post.slug}"
publishedAt: "${post.publishedAt}"
status: "${post.status}"
externalUrl: "${post.externalUrl}"
notionPageId: "${post.id}"
---

This post is hosted externally at: ${post.externalUrl}
`;
    const outputPath = path.join(POSTS_DIR, `${post.slug}.md`);
    writeFileSync(outputPath, frontmatter);
    console.log(`  ✓ Saved placeholder: ${outputPath}`);
    return null; // No content for reading time
  }

  // Get markdown content from Notion
  const mdBlocks = await n2m.pageToMarkdown(post.id);
  let content = n2m.toMarkdownString(mdBlocks).parent;

  // Download Notion-hosted images
  content = await processImages(content, post.slug);

  // Clean up markdown
  content = cleanMarkdown(content);

  // Build frontmatter
  const frontmatter = `---
title: "${post.title}"
slug: "${post.slug}"
publishedAt: "${post.publishedAt}"
status: "${post.status}"
notionPageId: "${post.id}"
---

`;

  // Save directly to posts directory
  const outputPath = path.join(POSTS_DIR, `${post.slug}.md`);
  writeFileSync(outputPath, frontmatter + content);
  console.log(`  ✓ Saved: ${outputPath}`);

  return content; // Return content for reading time calculation
}

/**
 * Ensure posts directory exists
 */
function preparePostsDir(): void {
  if (!existsSync(POSTS_DIR)) {
    mkdirSync(POSTS_DIR, { recursive: true });
  }
}

/**
 * Update index.json with post metadata
 */
function updatePostsIndex(posts: NotionPost[], contentMap: Map<string, string>): void {
  const indexPath = path.join(POSTS_DIR, "index.json");

  // Load existing index to preserve local-only posts
  let existingPosts: any[] = [];
  if (existsSync(indexPath)) {
    try {
      const existing = JSON.parse(readFileSync(indexPath, "utf-8"));
      existingPosts = existing.posts || [];
    } catch {
      // Ignore errors
    }
  }

  // Build index from Notion posts
  const notionSlugs = new Set(posts.map((p) => p.slug));
  const indexPosts = posts
    .filter((p) => p.status === "published")
    .map((p) => {
      const content = contentMap.get(p.slug);
      const readTime = content ? calculateReadingTime(content) : 0;
      return {
        slug: p.slug,
        title: p.title,
        publishedAt: p.publishedAt,
        readTime,
        status: p.status,
        ...(p.externalUrl && { externalUrl: p.externalUrl }),
      };
    });

  // Preserve local-only posts (not in Notion)
  for (const existing of existingPosts) {
    if (!notionSlugs.has(existing.slug)) {
      // Check if markdown file exists locally
      const mdPath = path.join(POSTS_DIR, `${existing.slug}.md`);
      if (existsSync(mdPath)) {
        indexPosts.push(existing);
      }
    }
  }

  // Sort by date
  indexPosts.sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  const index = { posts: indexPosts };
  writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`\nUpdated: ${indexPath}`);
}

/**
 * Main function
 */
async function main() {
  console.log("=== Notion Posts Sync ===\n");

  // Prepare posts directory
  preparePostsDir();

  // Fetch all posts from Notion
  const posts = await fetchPostsFromNotion();

  // Fetch each post's content
  const contentMap = new Map<string, string>();
  for (const post of posts) {
    try {
      const content = await fetchPost(post);
      if (content) {
        contentMap.set(post.slug, content);
      }
      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`  ✗ Error: ${error}`);
    }
  }

  // Update index
  updatePostsIndex(posts, contentMap);

  console.log("\n=== Sync Complete ===");
  console.log(`Synced ${posts.length} posts to ${POSTS_DIR}`);
}

main().catch((error) => {
  console.error("Sync failed:", error);
  process.exit(1);
});
