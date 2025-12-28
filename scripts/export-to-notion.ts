/**
 * Export existing posts to Notion
 *
 * This is a one-time script to bootstrap your Notion Posts database
 * with the existing posts from data/posts/*.json
 *
 * Usage:
 *   NOTION_TOKEN=secret_xxx NOTION_DATABASE_ID=xxx pnpm run export-to-notion
 */

import { Client } from "@notionhq/client";
import { readFileSync, readdirSync } from "fs";
import path from "path";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
  console.error("Missing NOTION_TOKEN or NOTION_DATABASE_ID environment variables");
  process.exit(1);
}

interface Post {
  slug: string;
  title: string;
  publishedAt: string;
  status: "published" | "draft";
  content: string;
  externalUrl?: string;
}

/**
 * Convert markdown content to Notion blocks
 * This is a simplified converter - handles common cases
 */
function markdownToNotionBlocks(markdown: string): any[] {
  const blocks: any[] = [];
  const lines = markdown.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Headings
    if (line.startsWith("## ")) {
      blocks.push({
        type: "heading_2",
        heading_2: {
          rich_text: [{ type: "text", text: { content: line.slice(3).trim() } }],
        },
      });
      i++;
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push({
        type: "heading_3",
        heading_3: {
          rich_text: [{ type: "text", text: { content: line.slice(4).trim() } }],
        },
      });
      i++;
      continue;
    }

    // Horizontal rule
    if (line.trim() === "---") {
      blocks.push({ type: "divider", divider: {} });
      i++;
      continue;
    }

    // Code blocks
    if (line.startsWith("```")) {
      const language = line.slice(3).trim() || "plain text";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```

      const codeContent = codeLines.join("\n");
      // Notion has a 2000 character limit per rich_text block
      if (codeContent.length <= 2000) {
        blocks.push({
          type: "code",
          code: {
            rich_text: [{ type: "text", text: { content: codeContent } }],
            language: mapLanguage(language),
          },
        });
      } else {
        // Split into multiple code blocks if too long
        const chunks = splitIntoChunks(codeContent, 1900);
        for (const chunk of chunks) {
          blocks.push({
            type: "code",
            code: {
              rich_text: [{ type: "text", text: { content: chunk } }],
              language: mapLanguage(language),
            },
          });
        }
      }
      continue;
    }

    // Tweet embeds: <tweet>url</tweet>
    const tweetMatch = line.match(/<tweet>(.*?)<\/tweet>/);
    if (tweetMatch) {
      blocks.push({
        type: "bookmark",
        bookmark: {
          url: tweetMatch[1].trim(),
        },
      });
      i++;
      continue;
    }

    // Bullet lists
    if (line.startsWith("- ")) {
      blocks.push({
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: parseInlineMarkdown(line.slice(2).trim()),
        },
      });
      i++;
      continue;
    }

    // Numbered lists
    const numberedMatch = line.match(/^\d+\.\s+(.*)$/);
    if (numberedMatch) {
      blocks.push({
        type: "numbered_list_item",
        numbered_list_item: {
          rich_text: parseInlineMarkdown(numberedMatch[1].trim()),
        },
      });
      i++;
      continue;
    }

    // Images: ![alt](url)
    const imageMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
    if (imageMatch) {
      const [, alt, url] = imageMatch;
      // Convert relative URLs to absolute
      const absoluteUrl = url.startsWith("/")
        ? `https://eriks.design${url}`
        : url;
      blocks.push({
        type: "image",
        image: {
          type: "external",
          external: { url: absoluteUrl },
          caption: alt
            ? [{ type: "text", text: { content: alt } }]
            : [],
        },
      });
      i++;
      continue;
    }

    // Regular paragraph - collect consecutive non-empty lines
    const paragraphLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("```") &&
      !lines[i].startsWith("- ") &&
      !lines[i].match(/^\d+\.\s/) &&
      !lines[i].startsWith("---") &&
      !lines[i].match(/<tweet>/)
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }

    const paragraphText = paragraphLines.join(" ").trim();
    if (paragraphText) {
      // Notion has 2000 char limit per rich_text array
      const richText = parseInlineMarkdown(paragraphText);
      blocks.push({
        type: "paragraph",
        paragraph: { rich_text: richText },
      });
    }
  }

  return blocks;
}

/**
 * Parse inline markdown (bold, italic, code, links) into Notion rich_text
 */
function parseInlineMarkdown(text: string): any[] {
  const result: any[] = [];

  // Simple regex-based parser for inline elements
  // This handles: **bold**, *italic*, `code`, [link](url)
  let remaining = text;

  while (remaining.length > 0) {
    // Link: [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      result.push({
        type: "text",
        text: {
          content: linkMatch[1],
          link: { url: linkMatch[2] },
        },
      });
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Bold: **text**
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
    if (boldMatch) {
      result.push({
        type: "text",
        text: { content: boldMatch[1] },
        annotations: { bold: true },
      });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Italic: *text* (but not **)
    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    if (italicMatch && !remaining.startsWith("**")) {
      result.push({
        type: "text",
        text: { content: italicMatch[1] },
        annotations: { italic: true },
      });
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Inline code: `text`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      result.push({
        type: "text",
        text: { content: codeMatch[1] },
        annotations: { code: true },
      });
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Plain text up to the next special character
    const plainMatch = remaining.match(/^[^*`\[]+/);
    if (plainMatch) {
      result.push({
        type: "text",
        text: { content: plainMatch[0] },
      });
      remaining = remaining.slice(plainMatch[0].length);
      continue;
    }

    // Single special character (fallback)
    result.push({
      type: "text",
      text: { content: remaining[0] },
    });
    remaining = remaining.slice(1);
  }

  return result;
}

/**
 * Map common language names to Notion's supported languages
 */
function mapLanguage(lang: string): string {
  const mapping: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    sh: "bash",
    shell: "bash",
    yml: "yaml",
    "": "plain text",
  };
  return mapping[lang.toLowerCase()] || lang.toLowerCase();
}

/**
 * Split text into chunks of max size
 */
function splitIntoChunks(text: string, maxSize: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    chunks.push(text.slice(start, start + maxSize));
    start += maxSize;
  }
  return chunks;
}

/**
 * Create a page in Notion for a post
 */
async function createNotionPage(post: Post): Promise<string> {
  console.log(`Creating page for: ${post.title}`);

  // Create the page with properties
  const page = await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: {
      // Title is the default "Name" property in Notion databases
      title: {
        title: [{ type: "text", text: { content: post.title } }],
      },
      Slug: {
        rich_text: [{ type: "text", text: { content: post.slug } }],
      },
      Published: {
        date: { start: post.publishedAt },
      },
      Status: {
        select: { name: post.status === "published" ? "Published" : "Draft" },
      },
      ...(post.externalUrl && {
        "External URL": {
          url: post.externalUrl,
        },
      }),
    },
  });

  // Add content blocks
  const blocks = markdownToNotionBlocks(post.content);

  // Notion API limits to 100 blocks per request
  for (let i = 0; i < blocks.length; i += 100) {
    const chunk = blocks.slice(i, i + 100);
    try {
      await notion.blocks.children.append({
        block_id: page.id,
        children: chunk,
      });
    } catch (error: any) {
      console.error(`  Error adding blocks ${i}-${i + chunk.length}:`, error.message);
      // Continue with remaining blocks
    }
  }

  console.log(`  ✓ Created: ${page.id}`);
  return page.id;
}

/**
 * Main function
 */
async function main() {
  const postsDir = path.join(process.cwd(), "data/posts");
  const files = readdirSync(postsDir).filter(
    (f) => f.endsWith(".json") && f !== "index.json"
  );

  console.log(`Found ${files.length} posts to export\n`);

  const results: { slug: string; notionId: string; error?: string }[] = [];

  for (const file of files) {
    const filePath = path.join(postsDir, file);
    const post: Post = JSON.parse(readFileSync(filePath, "utf-8"));

    // Skip posts with external URLs (they're hosted elsewhere)
    if (post.externalUrl) {
      console.log(`Skipping ${post.slug} (external URL)`);
      results.push({ slug: post.slug, notionId: "skipped-external" });
      continue;
    }

    try {
      const notionId = await createNotionPage(post);
      results.push({ slug: post.slug, notionId });

      // Rate limiting - Notion API has limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error: any) {
      console.error(`  ✗ Error: ${error.message}`);
      results.push({ slug: post.slug, notionId: "", error: error.message });
    }
  }

  console.log("\n=== Export Complete ===\n");
  console.log("Results:");
  for (const r of results) {
    if (r.error) {
      console.log(`  ✗ ${r.slug}: ${r.error}`);
    } else {
      console.log(`  ✓ ${r.slug}: ${r.notionId}`);
    }
  }

  console.log("\nNext steps:");
  console.log("1. Open your Notion database and verify the posts look correct");
  console.log("2. Rename the 'title' column to 'Title' if needed");
  console.log("3. Add the Slug, Published, Status, and External URL properties if they weren't auto-created");
  console.log("4. Share the database with your Notion integration");
}

main().catch((error) => {
  console.error("Export failed:", error);
  process.exit(1);
});
