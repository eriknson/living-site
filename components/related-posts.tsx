import type { PostMeta } from "@/lib/posts";
import { PostList } from "@/components/post-list";

interface RelatedPostsProps {
  posts: PostMeta[];
  currentSlug: string;
}

/**
 * Simple deterministic hash function for consistent shuffling
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Deterministic shuffle based on a seed
 */
function seededShuffle<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  let random = seed;
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Generate pseudo-random index using seed
    random = (random * 9301 + 49297) % 233280;
    const j = Math.floor((random / 233280) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

export function RelatedPosts({ posts, currentSlug }: RelatedPostsProps) {
  // Filter out current post and external links
  const otherPosts = posts.filter(
    (p) => p.slug !== currentSlug && !p.externalUrl
  );

  // Only show section if we have at least 3 posts to recommend
  if (otherPosts.length < 3) return null;

  // Use current slug as seed for deterministic shuffling
  // This ensures each post gets different recommendations, but consistent
  const seed = hashString(currentSlug);
  const shuffled = seededShuffle(otherPosts, seed);
  
  // Always show exactly 3 posts
  const recommendedPosts = shuffled.slice(0, 3);

  return (
    <section className="mt-16 pt-8 border-t border-black/10 dark:border-white/10">
      <h2 className="text-sm font-medium text-black/50 dark:text-white/50 mb-6 uppercase tracking-wide">
        More stuff
      </h2>
      <PostList posts={recommendedPosts} excludeStaticLink={true} />
    </section>
  );
}
