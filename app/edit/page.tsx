import { notFound } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { EditPageClient } from "@/components/edit-page-client";
import { getMainPageContent } from "@/lib/main-page";

export default async function EditPage() {
  // Check authentication server-side
  const authenticated = await isAuthenticated();
  
  if (!authenticated) {
    // Return 404 to make it invisible to non-authenticated users
    notFound();
  }

  const content = getMainPageContent();

  return <EditPageClient initialContent={content} />;
}
