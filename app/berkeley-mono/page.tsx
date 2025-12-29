import { BerkeleyMonoPageClient } from "./berkeley-mono-page-client";
import { getAllPosts } from "@/lib/posts";

export default function BerkeleyMonoPage() {
  const posts = getAllPosts();
  return <BerkeleyMonoPageClient posts={posts} />;
}
