/**
 * Export existing posts to Notion WITH IMAGES
 *
 * This parses contentHtml to extract images and their positions,
 * then creates Notion pages with images as external URLs pointing
 * to the live Vercel deployment (eriks.design).
 *
 * Usage:
 *   NOTION_TOKEN=secret_xxx NOTION_DATABASE_ID=xxx pnpm run export-to-notion
 */

import { Client } from "@notionhq/client";
import { readFileSync, readdirSync } from "fs";
import path from "path";
import * as cheerio from "cheerio";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.NOTION_DATABASE_ID!;
const SITE_URL = "https://eriks.design";

if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
  console.error(
    "Missing NOTION_TOKEN or NOTION_DATABASE_ID environment variables"
  );
  process.exit(1);
}

interface Post {
  slug: string;
  title: string;
  publishedAt: string;
  status: "published" | "draft";
  content: string;
  contentHtml: string;
  externalUrl?: string;
}

type NotionBlock = {
  type: string;
  [key: string]: any;
};

/**
 * Parse HTML content into Notion blocks
 * This properly extracts images and their positions
 */
function htmlToNotionBlocks(html: string): NotionBlock[] {
  const $ = cheerio.load(html);
  const blocks: NotionBlock[] = [];

  // Process each top-level element
  $("body")
    .children()
    .each((_, element) => {
      const el = $(element);
      const tagName = element.tagName?.toLowerCase();

      switch (tagName) {
        case "p": {
          const text = el.text().trim();
          if (text) {
            blocks.push({
              type: "paragraph",
              paragraph: {
                rich_text: parseRichText(el, $),
              },
            });
          }
          break;
        }

        case "h2": {
          blocks.push({
            type: "heading_2",
            heading_2: {
              rich_text: [{ type: "text", text: { content: el.text().trim() } }],
            },
          });
          break;
        }

        case "h3": {
          blocks.push({
            type: "heading_3",
            heading_3: {
              rich_text: [{ type: "text", text: { content: el.text().trim() } }],
            },
          });
          break;
        }

        case "hr": {
          blocks.push({ type: "divider", divider: {} });
          break;
        }

        case "pre": {
          const code = el.find("code").text();
          // Try to detect language from class or content
          const language = detectLanguage(code);
          blocks.push({
            type: "code",
            code: {
              rich_text: [{ type: "text", text: { content: code.slice(0, 2000) } }],
              language: language,
            },
          });
          break;
        }

        case "figure": {
          const img = el.find("img");
          if (img.length) {
            const src = img.attr("src") || "";
            const alt = img.attr("alt") || "";
            const absoluteUrl = src.startsWith("/") ? `${SITE_URL}${src}` : src;

            blocks.push({
              type: "image",
              image: {
                type: "external",
                external: { url: absoluteUrl },
                caption: alt ? [{ type: "text", text: { content: alt } }] : [],
              },
            });
          }
          break;
        }

        case "div": {
          // Check for tweet embed
          const blockquote = el.find("blockquote.twitter-tweet");
          if (blockquote.length) {
            const tweetUrl = blockquote.find("a").attr("href") || "";
            if (tweetUrl) {
              blocks.push({
                type: "bookmark",
                bookmark: { url: tweetUrl },
              });
            }
          } else {
            // Check for image grid
            el.find("img").each((_, imgEl) => {
              const img = $(imgEl);
              const src = img.attr("src") || "";
              const alt = img.attr("alt") || "";
              const absoluteUrl = src.startsWith("/") ? `${SITE_URL}${src}` : src;

              blocks.push({
                type: "image",
                image: {
                  type: "external",
                  external: { url: absoluteUrl },
                  caption: alt ? [{ type: "text", text: { content: alt } }] : [],
                },
              });
            });
          }
          break;
        }

        case "ul": {
          el.find("li").each((_, liEl) => {
            blocks.push({
              type: "bulleted_list_item",
              bulleted_list_item: {
                rich_text: [{ type: "text", text: { content: $(liEl).text().trim() } }],
              },
            });
          });
          break;
        }

        case "ol": {
          el.find("li").each((_, liEl) => {
            blocks.push({
              type: "numbered_list_item",
              numbered_list_item: {
                rich_text: [{ type: "text", text: { content: $(liEl).text().trim() } }],
              },
            });
          });
          break;
        }
      }
    });

  return blocks;
}

/**
 * Parse inline elements into Notion rich_text array
 */
function parseRichText(el: cheerio.Cheerio<any>, $: cheerio.CheerioAPI): any[] {
  const result: any[] = [];

  el.contents().each((_, node) => {
    if (node.type === "text") {
      const text = $(node).text();
      if (text) {
        result.push({ type: "text", text: { content: text } });
      }
    } else if (node.type === "tag") {
      const tagEl = $(node);
      const tagName = node.tagName?.toLowerCase();

      switch (tagName) {
        case "strong":
        case "b":
          result.push({
            type: "text",
            text: { content: tagEl.text() },
            annotations: { bold: true },
          });
          break;

        case "em":
        case "i":
          result.push({
            type: "text",
            text: { content: tagEl.text() },
            annotations: { italic: true },
          });
          break;

        case "code":
          result.push({
            type: "text",
            text: { content: tagEl.text() },
            annotations: { code: true },
          });
          break;

        case "a": {
          let href = tagEl.attr("href") || "";
          // Convert relative URLs to absolute
          if (href.startsWith("/")) {
            href = `${SITE_URL}${href}`;
          }
          result.push({
            type: "text",
            text: {
              content: tagEl.text(),
              link: href ? { url: href } : undefined,
            },
          });
          break;
        }

        default:
          result.push({ type: "text", text: { content: tagEl.text() } });
      }
    }
  });

  return result.length > 0 ? result : [{ type: "text", text: { content: "" } }];
}

/**
 * Detect programming language from code content
 */
function detectLanguage(code: string): string {
  if (code.includes("import ") || code.includes("export ")) return "typescript";
  if (code.includes("function ") || code.includes("const ")) return "javascript";
  if (code.includes("npm ") || code.includes("pnpm ") || code.includes("npx ")) return "bash";
  if (code.includes("git ")) return "bash";
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
  } catch (error) {
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
    } catch (error) {
      // Ignore errors
    }
  }
}

/**
 * Create or update a page in Notion
 */
async function upsertNotionPage(post: Post): Promise<string> {
  console.log(`\nProcessing: ${post.title}`);

  // Check if page exists
  const existingPageId = await findExistingPage(post.slug);

  if (existingPageId) {
    console.log(`  Found existing page: ${existingPageId}`);
    console.log(`  Clearing old content...`);
    await clearPageContent(existingPageId);

    // Add new content
    const blocks = htmlToNotionBlocks(post.contentHtml);
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
  const blocks = htmlToNotionBlocks(post.contentHtml);
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
  console.log("=== Export Posts to Notion (with images) ===\n");

  const postsDir = path.join(process.cwd(), "data/posts");
  const files = readdirSync(postsDir).filter(
    (f) => f.endsWith(".json") && f !== "index.json"
  );

  console.log(`Found ${files.length} posts to export`);

  const results: { slug: string; notionId: string; error?: string; imageCount: number }[] = [];

  for (const file of files) {
    const filePath = path.join(postsDir, file);
    const post: Post = JSON.parse(readFileSync(filePath, "utf-8"));

    // Skip posts with external URLs
    if (post.externalUrl) {
      console.log(`\nSkipping ${post.slug} (external URL)`);
      results.push({ slug: post.slug, notionId: "skipped-external", imageCount: 0 });
      continue;
    }

    // Count images for reporting
    const imageCount = (post.contentHtml.match(/<img/g) || []).length;

    try {
      const notionId = await upsertNotionPage(post);
      results.push({ slug: post.slug, notionId, imageCount });

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error: any) {
      console.error(`  ✗ Error: ${error.message}`);
      results.push({ slug: post.slug, notionId: "", error: error.message, imageCount });
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
  console.log(`\nTotal images exported: ${totalImages}`);
}

main().catch((error) => {
  console.error("Export failed:", error);
  process.exit(1);
});
