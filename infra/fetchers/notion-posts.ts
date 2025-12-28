/**
 * Fetch posts from Notion and save as raw markdown for agent processing
 *
 * This script:
 * 1. Fetches all pages (or a single page) from the Posts database
 * 2. Converts each page to markdown using notion-to-md
 * 3. Downloads images (Notion URLs expire)
 * 4. Saves raw markdown to data/posts/_raw/{slug}.md
 *
 * The post formatter agent then processes these into the final format.
 *
 * Usage:
 *   # Fetch all posts
 *   NOTION_TOKEN=secret_xxx NOTION_DATABASE_ID=xxx pnpm run fetch-notion-posts
 *
 *   # Fetch a single post by page ID (page-level isolation)
 *   NOTION_TOKEN=secret_xxx NOTION_DATABASE_ID=xxx pnpm run fetch-notion-posts -- --page-id=xxx
 */

import { Client } from "@notionhq/client";
import { NotionToMarkdown } from "notion-to-md";
import {
  writeFileSync,
  mkdirSync,
  existsSync,
  rmSync,
  readdirSync,
} from "fs";
import path from "path";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });
const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
  console.error(
    "Missing NOTION_TOKEN or NOTION_DATABASE_ID environment variables"
  );
  process.exit(1);
}

const RAW_DIR = path.join(process.cwd(), "data/posts/_raw");
const IMAGES_DIR = path.join(process.cwd(), "public/posts");

// Parse command line arguments
const args = process.argv.slice(2);
const pageIdArg = args.find((arg) => arg.startsWith("--page-id="));
const SINGLE_PAGE_ID = pageIdArg ? pageIdArg.split("=")[1] : null;

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
 * Fetch a single post by page ID
 */
async function fetchSinglePost(pageId: string): Promise<NotionPost | null> {
  console.log(`Fetching single page: ${pageId}`);

  try {
    const page = await notion.pages.retrieve({ page_id: pageId });
    const post = extractPostFromPage(page);
    console.log(`Found: "${post.title}" (${post.slug})`);
    return post;
  } catch (error: any) {
    if (error.code === "object_not_found") {
      console.log("Page not found - may have been deleted");
      return null;
    }
    throw error;
  }
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
 * Fetch and save a single post
 */
async function fetchPost(post: NotionPost): Promise<void> {
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
    const outputPath = path.join(RAW_DIR, `${post.slug}.md`);
    writeFileSync(outputPath, frontmatter);
    console.log(`  ✓ Saved placeholder: ${outputPath}`);
    return;
  }

  // Get markdown content from Notion
  const mdBlocks = await n2m.pageToMarkdown(post.id);
  let content = n2m.toMarkdownString(mdBlocks).parent;

  // Download Notion-hosted images
  content = await processImages(content, post.slug);

  // Build frontmatter
  const frontmatter = `---
title: "${post.title}"
slug: "${post.slug}"
publishedAt: "${post.publishedAt}"
status: "${post.status}"
notionPageId: "${post.id}"
---

`;

  // Save to _raw directory
  const outputPath = path.join(RAW_DIR, `${post.slug}.md`);
  writeFileSync(outputPath, frontmatter + content);
  console.log(`  ✓ Saved: ${outputPath}`);
}

/**
 * Clean up _raw directory (or just ensure it exists for single-page mode)
 */
function prepareRawDir(singlePageMode: boolean): void {
  if (singlePageMode) {
    // Single page mode: just ensure directory exists, don't clean
    if (!existsSync(RAW_DIR)) {
      mkdirSync(RAW_DIR, { recursive: true });
    }
  } else {
    // Full sync: clean and recreate
    if (existsSync(RAW_DIR)) {
      rmSync(RAW_DIR, { recursive: true });
    }
    mkdirSync(RAW_DIR, { recursive: true });
  }
}

/**
 * Save the posts index for reference
 */
function savePostsIndex(posts: NotionPost[]): void {
  const indexPath = path.join(RAW_DIR, "_index.json");
  writeFileSync(
    indexPath,
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        posts: posts.map((p) => ({
          slug: p.slug,
          title: p.title,
          publishedAt: p.publishedAt,
          status: p.status,
          externalUrl: p.externalUrl,
          notionPageId: p.id,
        })),
      },
      null,
      2
    )
  );
  console.log(`\nSaved index: ${indexPath}`);
}

/**
 * Main function
 */
async function main() {
  const singlePageMode = !!SINGLE_PAGE_ID;

  if (singlePageMode) {
    console.log("=== Notion Posts Fetcher (Single Page Mode) ===\n");
    console.log(`Page ID: ${SINGLE_PAGE_ID}\n`);
  } else {
    console.log("=== Notion Posts Fetcher ===\n");
  }

  // Prepare _raw directory
  prepareRawDir(singlePageMode);

  let posts: NotionPost[] = [];

  if (singlePageMode) {
    // Fetch single page
    const post = await fetchSinglePost(SINGLE_PAGE_ID!);
    if (post) {
      posts = [post];
    } else {
      console.log("No post to process");
      return;
    }
  } else {
    // Fetch all posts
    posts = await fetchPostsFromNotion();
  }

  // Fetch each post's content
  for (const post of posts) {
    try {
      await fetchPost(post);
      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`  ✗ Error: ${error}`);
    }
  }

  // Save index (includes the slug for format-posts to know what to process)
  savePostsIndex(posts);

  console.log("\n=== Fetch Complete ===");
  console.log(`\nRaw files saved to: ${RAW_DIR}`);
  if (singlePageMode) {
    console.log(`Processed single page: ${posts[0]?.slug}`);
  }
  console.log(
    "Next: Run the post formatter agent to process into final format"
  );
}

main().catch((error) => {
  console.error("Fetch failed:", error);
  process.exit(1);
});
