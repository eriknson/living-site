import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { LoginPageClient } from "@/components/login-page-client";

export default async function LoginPage() {
  // If already authenticated, redirect to edit page
  const authenticated = await isAuthenticated();
  if (authenticated) {
    redirect("/edit");
  }

  return <LoginPageClient />;
}
