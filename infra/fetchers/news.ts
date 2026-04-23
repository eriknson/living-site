/**
 * News Fetcher
 * Fetches a small set of headlines from public RSS feeds.
 * No API key required. Output is intentionally compact — just titles
 * and sources — so the curator can transform them into game inspiration
 * without copying headlines verbatim.
 */

import { writeFile } from "fs/promises";

const RSS_FEEDS = [
  { name: "Reuters World", url: "https://feeds.reuters.com/reuters/topNews" },
  { name: "Hacker News", url: "https://hnrss.org/frontpage?count=10" },
  { name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
];

const MAX_ITEMS_PER_FEED = 3;
const MAX_TOTAL_ITEMS = 8;
const FETCH_TIMEOUT_MS = 8000;

export interface NewsItem {
  title: string;
  source: string;
}

export interface NewsData {
  fetched_at: string;
  items: NewsItem[];
}

function extractItems(xml: string, sourceName: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null && items.length < MAX_ITEMS_PER_FEED) {
    const block = match[1];
    const titleMatch = block.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
    if (titleMatch?.[1]) {
      const title = titleMatch[1].trim().replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
      if (title.length > 5 && title.length < 200) {
        items.push({ title, source: sourceName });
      }
    }
  }

  return items;
}

export async function fetchNews(): Promise<NewsData> {
  const allItems: NewsItem[] = [];

  for (const feed of RSS_FEEDS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(feed.url, {
        signal: controller.signal,
        headers: { "User-Agent": "living-site-aggregator" },
      });

      if (!res.ok) {
        console.error(`  ${feed.name}: HTTP ${res.status}`);
        continue;
      }

      const xml = await res.text();
      const items = extractItems(xml, feed.name);
      allItems.push(...items);
      console.log(`  ${feed.name}: ${items.length} items`);
    } catch (err) {
      console.error(`  ${feed.name}: ${(err as Error).message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  const data: NewsData = {
    fetched_at: new Date().toISOString(),
    items: allItems.slice(0, MAX_TOTAL_ITEMS),
  };

  return data;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Fetching news headlines...");
  fetchNews()
    .then(async (data) => {
      await writeFile("data/news.json", JSON.stringify(data, null, 2));
      console.log(`\n✓ Saved ${data.items.length} items to data/news.json`);
    })
    .catch((err) => {
      console.error("Error:", err.message);
      process.exit(1);
    });
}
