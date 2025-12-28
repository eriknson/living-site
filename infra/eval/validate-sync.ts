/**
 * Validate Notion Sync Output
 *
 * Compares synced posts with reference versions to ensure:
 * 1. No content loss (character count within threshold)
 * 2. Image paths are relative (/posts/...), not absolute
 * 3. Code blocks have proper styling
 * 4. All images are present
 * 5. Key structural elements preserved
 *
 * Exit codes:
 *   0 = All validations passed
 *   1 = Validation failures found
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import path from "path";

const POSTS_DIR = path.join(process.cwd(), "data/posts");
const REFERENCE_DIR = path.join(process.cwd(), "data/posts/_reference");

interface ValidationResult {
  slug: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
}

interface Post {
  slug: string;
  title: string;
  content: string;
  contentHtml: string;
  status: string;
}

/**
 * Count occurrences of a pattern in text
 */
function countMatches(text: string, pattern: RegExp): number {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

/**
 * Validate a single post
 */
function validatePost(slug: string): ValidationResult {
  const result: ValidationResult = {
    slug,
    passed: true,
    errors: [],
    warnings: [],
  };

  const postPath = path.join(POSTS_DIR, `${slug}.json`);
  const refPath = path.join(REFERENCE_DIR, `${slug}.json`);

  // Check if post exists
  if (!existsSync(postPath)) {
    result.errors.push(`Post file not found: ${postPath}`);
    result.passed = false;
    return result;
  }

  const post: Post = JSON.parse(readFileSync(postPath, "utf-8"));

  // Check if reference exists
  const hasReference = existsSync(refPath);
  const reference: Post | null = hasReference
    ? JSON.parse(readFileSync(refPath, "utf-8"))
    : null;

  // 1. Check content length - only WARN on changes, don't fail
  // This allows intentional text edits in Notion
  if (reference) {
    const refLength = reference.contentHtml.length;
    const postLength = post.contentHtml.length;
    const change = (refLength - postLength) / refLength;

    if (Math.abs(change) > 0.5) {
      // Only fail if MORE THAN HALF the content is lost (likely corruption)
      result.errors.push(
        `Content changed by ${(change * 100).toFixed(1)}% (${refLength} → ${postLength} chars) - possible corruption`
      );
      result.passed = false;
    } else if (Math.abs(change) > 0.1) {
      // Large change is a warning, not an error
      result.warnings.push(
        `Content changed by ${(change * 100).toFixed(1)}% (intentional edit?)`
      );
    }
  }

  // 2. Check image paths are relative (only for img tags, not scripts)
  const absoluteImages = countMatches(
    post.contentHtml,
    /<img[^>]+src="https?:\/\/[^"]+"/g
  );
  if (absoluteImages > 0) {
    result.errors.push(
      `Found ${absoluteImages} absolute image URLs (should be relative)`
    );
    result.passed = false;
  }

  // 3. Check image count matches reference
  if (reference) {
    const refImages = countMatches(reference.contentHtml, /<img/g);
    const postImages = countMatches(post.contentHtml, /<img/g);

    if (postImages < refImages) {
      result.errors.push(
        `Missing images: ${postImages} vs ${refImages} in reference`
      );
      result.passed = false;
    }
  }

  // 4. Check code block styling
  const codeBlocks = countMatches(post.contentHtml, /<pre/g);
  const styledCodeBlocks = countMatches(
    post.contentHtml,
    /<pre style="[^"]*border-radius/g
  );

  if (codeBlocks > 0 && styledCodeBlocks < codeBlocks) {
    result.warnings.push(
      `${codeBlocks - styledCodeBlocks} code blocks missing styling`
    );
  }

  // 5. Check heading count
  if (reference) {
    const refHeadings = countMatches(reference.contentHtml, /<h[23]/g);
    const postHeadings = countMatches(post.contentHtml, /<h[23]/g);

    if (postHeadings < refHeadings) {
      result.errors.push(
        `Missing headings: ${postHeadings} vs ${refHeadings} in reference`
      );
      result.passed = false;
    }
  }

  // 6. Check tweet embeds
  if (reference) {
    const refTweets = countMatches(reference.contentHtml, /twitter-tweet/g);
    const postTweets = countMatches(post.contentHtml, /twitter-tweet/g);

    if (postTweets < refTweets) {
      result.errors.push(
        `Missing tweets: ${postTweets} vs ${refTweets} in reference`
      );
      result.passed = false;
    }
  }

  // 7. Check status is published
  if (post.status !== "published") {
    result.warnings.push(`Post status is "${post.status}", not "published"`);
  }

  return result;
}

/**
 * Main validation function
 */
function main() {
  console.log("=== Notion Sync Validation ===\n");

  // Get all post files
  const postFiles = readdirSync(POSTS_DIR).filter(
    (f) => f.endsWith(".json") && f !== "index.json" && !f.startsWith("_")
  );

  console.log(`Found ${postFiles.length} posts to validate\n`);

  const results: ValidationResult[] = [];
  let allPassed = true;

  for (const file of postFiles) {
    const slug = file.replace(".json", "");
    const result = validatePost(slug);
    results.push(result);

    const status = result.passed ? "✓" : "✗";
    console.log(`${status} ${slug}`);

    for (const error of result.errors) {
      console.log(`    ERROR: ${error}`);
    }
    for (const warning of result.warnings) {
      console.log(`    WARN: ${warning}`);
    }

    if (!result.passed) {
      allPassed = false;
    }
  }

  console.log("\n=== Summary ===");
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Passed: ${passed}/${results.length}`);
  console.log(`Failed: ${failed}/${results.length}`);

  if (!allPassed) {
    console.log("\n❌ Validation FAILED");
    process.exit(1);
  } else {
    console.log("\n✅ Validation PASSED");
    process.exit(0);
  }
}

main();
