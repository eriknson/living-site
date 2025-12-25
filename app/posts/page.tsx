import { getAllPosts } from "@/lib/posts";
import { PostsPageClient } from "./posts-page-client";

export default function PostsPage() {
  const posts = getAllPosts();

  return <PostsPageClient posts={posts} />;
}
