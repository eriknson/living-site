/**
 * Export existing posts to Notion
 *
 * This reads markdown files from data/posts/ and creates/updates
 * corresponding pages in the Notion database.
 *
 * Usage:
 *   NOTION_TOKEN=secret_xxx NOTION_DATABASE_ID=xxx pnpm run export-to-notion
 */

import { Client } from "@notionhq/client";
import { readFileSync, readdirSync, existsSync } from "fs";
import path from "path";
import matter from "gray-matter";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.NOTION_DATABASE_ID!;
const SITE_URL = "https://eriks.design";

if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
  console.error(
    "Missing NOTION_TOKEN or NOTION_DATABASE_ID environment variables"
  );
  process.exit(1);
}

interface PostFrontmatter {
  slug: string;
  title: string;
  publishedAt: string;
  status: "published" | "draft";
  externalUrl?: string;
  notionPageId?: string;
}

type NotionBlock = {
  type: string;
  [key: string]: any;
};

/**
 * Parse markdown content into Notion blocks
 */
function markdownToNotionBlocks(markdown: string): NotionBlock[] {
  const blocks: NotionBlock[] = [];
  const lines = markdown.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty line - skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Horizontal rule
    if (line.trim() === "---") {
      blocks.push({ type: "divider", divider: {} });
      i++;
      continue;
    }

    // Heading 2
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

    // Heading 3
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

    // Code block
    if (line.startsWith("```")) {
      const language = detectLanguage(line.slice(3).trim());
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```

      const code = codeLines.join("\n");
      blocks.push({
        type: "code",
        code: {
          rich_text: [{ type: "text", text: { content: code.slice(0, 2000) } }],
          language: language,
        },
      });
      continue;
    }

    // Tweet embed
    const tweetMatch = line.match(/<tweet>(.*?)<\/tweet>/);
    if (tweetMatch) {
      blocks.push({
        type: "bookmark",
        bookmark: { url: tweetMatch[1].trim() },
      });
      i++;
      continue;
    }

    // Image
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
      const alt = imgMatch[1];
      let src = imgMatch[2];
      // Convert relative URLs to absolute
      if (src.startsWith("/")) {
        src = `${SITE_URL}${src}`;
      }
      blocks.push({
        type: "image",
        image: {
          type: "external",
          external: { url: src },
          caption: alt ? [{ type: "text", text: { content: alt } }] : [],
        },
      });
      i++;
      continue;
    }

    // Bullet list
    if (line.startsWith("- ")) {
      while (i < lines.length && lines[i].startsWith("- ")) {
        blocks.push({
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: parseInlineText(lines[i].slice(2).trim()),
          },
        });
        i++;
      }
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        blocks.push({
          type: "numbered_list_item",
          numbered_list_item: {
            rich_text: parseInlineText(lines[i].replace(/^\d+\.\s+/, "").trim()),
          },
        });
        i++;
      }
      continue;
    }

    // Paragraph (collect lines until we hit something else)
    const paragraphLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("```") &&
      !lines[i].startsWith("- ") &&
      !/^\d+\.\s/.test(lines[i]) &&
      !lines[i].startsWith("---") &&
      !/<tweet>/.test(lines[i]) &&
      !/^!\[/.test(lines[i])
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }

    const paragraph = paragraphLines.join(" ").trim();
    if (paragraph) {
      blocks.push({
        type: "paragraph",
        paragraph: {
          rich_text: parseInlineText(paragraph),
        },
      });
    }
  }

  return blocks;
}

/**
 * Parse inline markdown (bold, italic, code, links) to Notion rich_text
 */
function parseInlineText(text: string): any[] {
  const result: any[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Bold **text**
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

    // Italic *text* or _text_
    const italicMatch = remaining.match(/^\*([^*]+)\*/) || remaining.match(/^_([^_]+)_/);
    if (italicMatch) {
      result.push({
        type: "text",
        text: { content: italicMatch[1] },
        annotations: { italic: true },
      });
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Inline code `text`
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

    // Link [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      let href = linkMatch[2];
      // Convert relative URLs to absolute
      if (href.startsWith("/")) {
        href = `${SITE_URL}${href}`;
      }
      result.push({
        type: "text",
        text: {
          content: linkMatch[1],
          link: { url: href },
        },
      });
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // Regular text - find the next special character
    const nextSpecial = remaining.search(/[\*_`\[]/);
    if (nextSpecial === -1) {
      // No more special characters
      result.push({ type: "text", text: { content: remaining } });
      break;
    } else if (nextSpecial === 0) {
      // Special char at start but not matched - treat as regular text
      result.push({ type: "text", text: { content: remaining[0] } });
      remaining = remaining.slice(1);
    } else {
      // Add text up to next special char
      result.push({ type: "text", text: { content: remaining.slice(0, nextSpecial) } });
      remaining = remaining.slice(nextSpecial);
    }
  }

  return result.length > 0 ? result : [{ type: "text", text: { content: "" } }];
}

/**
 * Detect programming language from code content or hint
 */
function detectLanguage(hint: string): string {
  const lowerHint = hint.toLowerCase();
  
  // Direct language hints
  if (lowerHint === "typescript" || lowerHint === "ts" || lowerHint === "tsx") return "typescript";
  if (lowerHint === "javascript" || lowerHint === "js" || lowerHint === "jsx") return "javascript";
  if (lowerHint === "bash" || lowerHint === "sh" || lowerHint === "shell") return "bash";
  if (lowerHint === "yaml" || lowerHint === "yml") return "yaml";
  if (lowerHint === "json") return "json";
  if (lowerHint === "css") return "css";
  if (lowerHint === "html") return "html";
  
  // For ASCII art or plain text
  if (lowerHint === "" || lowerHint === "plain text" || lowerHint === "text") return "plain text";
  
  return "plain text";
}

/**
 * Check if a page already exists for this slug
 */
async function findExistingPage(slug: string): Promise<string | null> {
  try {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      filter: {
        property: "Slug",
        rich_text: { equals: slug },
      },
    });

    if (response.results.length > 0) {
      return response.results[0].id;
    }
  } catch {
    // Property might not exist yet
  }
  return null;
}

/**
 * Delete all blocks from a page (to replace content)
 */
async function clearPageContent(pageId: string): Promise<void> {
  const blocks = await notion.blocks.children.list({ block_id: pageId });

  for (const block of blocks.results) {
    try {
      await notion.blocks.delete({ block_id: block.id });
    } catch {
      // Ignore errors
    }
  }
}

/**
 * Create or update a page in Notion
 */
async function upsertNotionPage(frontmatter: PostFrontmatter, content: string): Promise<string> {
  console.log(`\nProcessing: ${frontmatter.title}`);

  // Check if page exists
  const existingPageId = await findExistingPage(frontmatter.slug);

  const blocks = markdownToNotionBlocks(content);
  console.log(`  Parsed ${blocks.length} blocks`);

  if (existingPageId) {
    console.log(`  Found existing page: ${existingPageId}`);
    console.log(`  Clearing old content...`);
    await clearPageContent(existingPageId);

    // Add new content
    console.log(`  Adding ${blocks.length} blocks...`);

    for (let i = 0; i < blocks.length; i += 100) {
      const chunk = blocks.slice(i, i + 100);
      try {
        await notion.blocks.children.append({
          block_id: existingPageId,
          children: chunk,
        });
      } catch (error: any) {
        console.error(`  Error adding blocks ${i}-${i + chunk.length}:`, error.message);
      }
    }

    console.log(`  ✓ Updated: ${existingPageId}`);
    return existingPageId;
  }

  // Create new page
  console.log(`  Creating new page...`);

  const page = await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: {
      title: {
        title: [{ type: "text", text: { content: frontmatter.title } }],
      },
      Slug: {
        rich_text: [{ type: "text", text: { content: frontmatter.slug } }],
      },
      Published: {
        date: { start: frontmatter.publishedAt },
      },
      Status: {
        select: { name: frontmatter.status === "published" ? "Published" : "Draft" },
      },
      ...(frontmatter.externalUrl && {
        "External URL": {
          url: frontmatter.externalUrl,
        },
      }),
    },
  });

  // Add content blocks
  console.log(`  Adding ${blocks.length} blocks...`);

  for (let i = 0; i < blocks.length; i += 100) {
    const chunk = blocks.slice(i, i + 100);
    try {
      await notion.blocks.children.append({
        block_id: page.id,
        children: chunk,
      });
    } catch (error: any) {
      console.error(`  Error adding blocks ${i}-${i + chunk.length}:`, error.message);
    }
  }

  console.log(`  ✓ Created: ${page.id}`);
  return page.id;
}

/**
 * Main function
 */
async function main() {
  console.log("=== Export Posts to Notion ===\n");

  const postsDir = path.join(process.cwd(), "data/posts");
  const files = readdirSync(postsDir).filter(
    (f) => f.endsWith(".md") && !f.startsWith("_")
  );

  console.log(`Found ${files.length} posts to export`);

  const results: { slug: string; notionId: string; error?: string; imageCount: number }[] = [];

  for (const file of files) {
    const filePath = path.join(postsDir, file);
    const fileContent = readFileSync(filePath, "utf-8");
    const { data, content } = matter(fileContent);

    const frontmatter: PostFrontmatter = {
      slug: data.slug || file.replace(".md", ""),
      title: data.title || "Untitled",
      publishedAt: data.publishedAt || new Date().toISOString().split("T")[0],
      status: data.status || "draft",
      externalUrl: data.externalUrl,
      notionPageId: data.notionPageId,
    };

    // Skip posts with external URLs
    if (frontmatter.externalUrl) {
      console.log(`\nSkipping ${frontmatter.slug} (external URL)`);
      results.push({ slug: frontmatter.slug, notionId: "skipped-external", imageCount: 0 });
      continue;
    }

    // Count images for reporting
    const imageCount = (content.match(/!\[/g) || []).length;

    try {
      const notionId = await upsertNotionPage(frontmatter, content);
      results.push({ slug: frontmatter.slug, notionId, imageCount });

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error: any) {
      console.error(`  ✗ Error: ${error.message}`);
      results.push({ slug: frontmatter.slug, notionId: "", error: error.message, imageCount });
    }
  }

  console.log("\n=== Export Complete ===\n");
  console.log("Results:");
  for (const r of results) {
    if (r.error) {
      console.log(`  ✗ ${r.slug}: ${r.error}`);
    } else {
      console.log(`  ✓ ${r.slug}: ${r.notionId} (${r.imageCount} images)`);
    }
  }

  const totalImages = results.reduce((sum, r) => sum + r.imageCount, 0);
  console.log(`\nTotal images: ${totalImages}`);
}

main().catch((error) => {
  console.error("Export failed:", error);
  process.exit(1);
});
