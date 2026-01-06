import { HomePageClient } from "@/components/home-page-client";
import { getAllPosts } from "@/lib/posts";
import { getMainPageContent } from "@/lib/main-page";

export default function HomePage() {
  const posts = getAllPosts();
  const mainPageContent = getMainPageContent();
  return <HomePageClient posts={posts} content={mainPageContent} />;
}
