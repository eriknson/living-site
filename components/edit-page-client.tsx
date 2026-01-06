"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { GlobalMenuBar } from "@/components/global-menu-bar";
import type { MainPageContent } from "@/lib/main-page";

const smoothEase = [0.25, 0.1, 0.25, 1] as const;

export function EditPageClient({ initialContent }: { initialContent: MainPageContent }) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  // Check authentication status
  useEffect(() => {
    fetch("/api/auth/check")
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          setIsAuthenticated(false);
        }
      })
      .catch(() => setIsAuthenticated(false));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("idle");

    try {
      const response = await fetch("/api/main-page", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      setSaveStatus("success");
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1000);
    } catch (error) {
      console.error("Error saving:", error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  if (!isAuthenticated) {
    return null; // Will be handled by server-side check
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[#fafaf9] dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-[#e5e5e5]">
      <div className="sticky top-0 z-50">
        <GlobalMenuBar currentRoute="/edit" />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: smoothEase }}
        className="flex-1 flex flex-col"
      >
        <main className="max-w-[640px] mx-auto px-6 pt-16 w-full">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Edit Main Page</h1>
            <button
              onClick={handleLogout}
              className="text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Greeting</label>
              <input
                type="text"
                value={content.greeting}
                onChange={(e) => setContent({ ...content, greeting: e.target.value })}
                className="w-full px-3 py-2 border border-black/10 dark:border-white/10 rounded-md bg-white dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Bio (before links)</label>
              <textarea
                value={content.bio}
                onChange={(e) => setContent({ ...content, bio: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-black/10 dark:border-white/10 rounded-md bg-white dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Links</label>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-black/60 dark:text-white/60 mb-1">X</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Text"
                      value={content.links.x.text}
                      onChange={(e) =>
                        setContent({
                          ...content,
                          links: { ...content.links, x: { ...content.links.x, text: e.target.value } },
                        })
                      }
                      className="px-3 py-2 border border-black/10 dark:border-white/10 rounded-md bg-white dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    />
                    <input
                      type="text"
                      placeholder="URL"
                      value={content.links.x.url}
                      onChange={(e) =>
                        setContent({
                          ...content,
                          links: { ...content.links, x: { ...content.links.x, url: e.target.value } },
                        })
                      }
                      className="px-3 py-2 border border-black/10 dark:border-white/10 rounded-md bg-white dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-black/60 dark:text-white/60 mb-1">GitHub</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Text"
                      value={content.links.github.text}
                      onChange={(e) =>
                        setContent({
                          ...content,
                          links: { ...content.links, github: { ...content.links.github, text: e.target.value } },
                        })
                      }
                      className="px-3 py-2 border border-black/10 dark:border-white/10 rounded-md bg-white dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    />
                    <input
                      type="text"
                      placeholder="URL"
                      value={content.links.github.url}
                      onChange={(e) =>
                        setContent({
                          ...content,
                          links: { ...content.links, github: { ...content.links.github, url: e.target.value } },
                        })
                      }
                      className="px-3 py-2 border border-black/10 dark:border-white/10 rounded-md bg-white dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-black/60 dark:text-white/60 mb-1">Email</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Text"
                      value={content.links.email.text}
                      onChange={(e) =>
                        setContent({
                          ...content,
                          links: { ...content.links, email: { ...content.links.email, text: e.target.value } },
                        })
                      }
                      className="px-3 py-2 border border-black/10 dark:border-white/10 rounded-md bg-white dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    />
                    <input
                      type="text"
                      placeholder="URL"
                      value={content.links.email.url}
                      onChange={(e) =>
                        setContent({
                          ...content,
                          links: { ...content.links, email: { ...content.links.email, url: e.target.value } },
                        })
                      }
                      className="px-3 py-2 border border-black/10 dark:border-white/10 rounded-md bg-white dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Bio (after links)</label>
              <input
                type="text"
                value={content.bioAfterLinks}
                onChange={(e) => setContent({ ...content, bioAfterLinks: e.target.value })}
                className="w-full px-3 py-2 border border-black/10 dark:border-white/10 rounded-md bg-white dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
              />
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-md hover:opacity-80 transition-opacity disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>

              {saveStatus === "success" && (
                <span className="text-sm text-green-600 dark:text-green-400">Saved! Redirecting...</span>
              )}
              {saveStatus === "error" && (
                <span className="text-sm text-red-600 dark:text-red-400">Error saving. Please try again.</span>
              )}
            </div>

            <div className="mt-8 p-4 bg-black/5 dark:bg-white/5 rounded-md">
              <p className="text-sm text-black/60 dark:text-white/60 mb-2">Preview:</p>
              <div className="text-[15px] leading-[1.5] text-black/85 dark:text-white/85 space-y-4">
                <p>{content.greeting}</p>
                <p>
                  {content.bio}{" "}
                  <a href={content.links.x.url} className="underline">
                    {content.links.x.text}
                  </a>
                  , checkout my{" "}
                  <a href={content.links.github.url} className="underline">
                    {content.links.github.text}
                  </a>
                  {content.bioAfterLinks}{" "}
                  <a href={content.links.email.url} className="underline">
                    {content.links.email.text}
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </main>
      </motion.div>
    </div>
  );
}
