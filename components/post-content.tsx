"use client";

import { useMemo } from "react";
import { TweetEmbed } from "./tweet-embed";

interface PostContentProps {
  html: string;
}

// Pattern to match Twitter blockquote sections
const TWITTER_BLOCK_PATTERN =
  /<div[^>]*class="[^"]*"[^>]*>\s*<blockquote[^>]*class="twitter-tweet"[^>]*>[\s\S]*?<a[^>]*href="https?:\/\/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)"[^>]*>[\s\S]*?<\/blockquote>\s*<\/div>\s*(?:<script[^>]*><\/script>)?/gi;

// Alternative pattern for just the blockquote without wrapper div
const TWITTER_BLOCKQUOTE_PATTERN =
  /<blockquote[^>]*class="twitter-tweet"[^>]*>[\s\S]*?<a[^>]*href="https?:\/\/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)"[^>]*>[\s\S]*?<\/blockquote>\s*(?:<script[^>]*><\/script>)?/gi;

interface ContentSegment {
  type: "html" | "tweet";
  content: string; // HTML content or tweet ID
}

function parseContent(html: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let lastIndex = 0;

  // Try both patterns
  const patterns = [TWITTER_BLOCK_PATTERN, TWITTER_BLOCKQUOTE_PATTERN];

  // Find all matches across both patterns
  const allMatches: { index: number; length: number; tweetId: string }[] = [];

  for (const pattern of patterns) {
    // Reset pattern
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(html)) !== null) {
      allMatches.push({
        index: match.index,
        length: match[0].length,
        tweetId: match[1],
      });
    }
  }

  // Sort by index and deduplicate overlapping matches
  allMatches.sort((a, b) => a.index - b.index);
  const uniqueMatches = allMatches.filter((match, i) => {
    if (i === 0) return true;
    const prev = allMatches[i - 1];
    return match.index >= prev.index + prev.length;
  });

  for (const match of uniqueMatches) {
    // Add HTML before this match
    if (match.index > lastIndex) {
      const htmlContent = html.slice(lastIndex, match.index).trim();
      if (htmlContent) {
        segments.push({ type: "html", content: htmlContent });
      }
    }

    // Add tweet
    segments.push({ type: "tweet", content: match.tweetId });

    lastIndex = match.index + match.length;
  }

  // Add remaining HTML
  if (lastIndex < html.length) {
    const remaining = html.slice(lastIndex).trim();
    if (remaining) {
      segments.push({ type: "html", content: remaining });
    }
  }

  return segments;
}

export function PostContent({ html }: PostContentProps) {
  const segments = useMemo(() => parseContent(html), [html]);

  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === "tweet") {
          return <TweetEmbed key={`tweet-${index}`} id={segment.content} />;
        }
        return (
          <div
            key={`html-${index}`}
            dangerouslySetInnerHTML={{ __html: segment.content }}
          />
        );
      })}
    </>
  );
}
