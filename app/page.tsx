import { HomePageClient } from "@/components/home-page-client";
import { getAllPosts } from "@/lib/posts";

export default function HomePage() {
  const posts = getAllPosts();
  return <HomePageClient posts={posts} />;
}
