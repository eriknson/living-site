import { HomePageClient } from "@/components/home-page-client";
import { getManualVersionData } from "@/lib/manual-version-server";
import { getManifest } from "@/lib/manifest-server";
import { getAllPosts } from "@/lib/posts";

export default async function HomePage() {
  const posts = getAllPosts();
  const [manifest, manualVersion] = await Promise.all([
    getManifest().catch(() => null),
    getManualVersionData(),
  ]);

  return (
    <HomePageClient
      posts={posts}
      manifest={manifest}
      manualVersionDate={manualVersion?.lastUpdated ?? null}
    />
  );
}
