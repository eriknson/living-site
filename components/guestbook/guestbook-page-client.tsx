"use client";

import { useState, useEffect, FormEvent } from "react";
import { motion } from "motion/react";
import { GlobalMenuBar } from "@/components/global-menu-bar";
import type { GuestbookEntry } from "@/app/api/guestbook/route";

const smoothEase = [0.25, 0.1, 0.25, 1] as const;

export function GuestbookPageClient() {
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch entries on mount
  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/guestbook");
      const data = await res.json();
      if (res.ok) {
        setEntries(data.entries || []);
      } else {
        setError(data.error || "Failed to load entries");
      }
    } catch (err) {
      setError("Failed to load entries");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!name.trim() || !message.trim()) {
      setError("Please fill in both name and message");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), message: message.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setName("");
        setMessage("");
        // Refresh entries
        await fetchEntries();
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error || "Failed to submit entry");
      }
    } catch (err) {
      setError("Failed to submit entry");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[#fafaf9] dark:bg-[#0a0a0a] text-[#1a1a1a] dark:text-[#e5e5e5]">
      {/* Menu Bar */}
      <div className="sticky top-0 z-50">
        <GlobalMenuBar currentRoute="/guestbook" />
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: smoothEase }}
        className="flex-1 flex flex-col"
      >
        <main className="max-w-[640px] mx-auto px-6 pt-16 pb-16 w-full">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-2xl font-medium mb-4 text-black/90 dark:text-white/90">
              Guestbook
            </h1>
            <p className="text-[15px] leading-[1.5] text-black/70 dark:text-white/70">
              Leave a note and let me know you stopped by.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mb-12 space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-[14px] font-medium mb-2 text-black/80 dark:text-white/80"
              >
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
                disabled={submitting}
                className="w-full px-4 py-2.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] text-[15px] text-black/90 dark:text-white/90 placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                placeholder="Your name"
              />
            </div>

            <div>
              <label
                htmlFor="message"
                className="block text-[14px] font-medium mb-2 text-black/80 dark:text-white/80"
              >
                Message
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={1000}
                required
                rows={5}
                disabled={submitting}
                className="w-full px-4 py-2.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] text-[15px] text-black/90 dark:text-white/90 placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors resize-none"
                placeholder="Your message..."
              />
              <div className="mt-1 text-[12px] text-black/40 dark:text-white/40 text-right">
                {message.length}/1000
              </div>
            </div>

            {error && (
              <div className="px-4 py-2.5 rounded-lg bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 dark:border-red-500/30 text-[14px] text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            {success && (
              <div className="px-4 py-2.5 rounded-lg bg-green-500/10 dark:bg-green-500/20 border border-green-500/20 dark:border-green-500/30 text-[14px] text-green-700 dark:text-green-400">
                Thank you for your message! It's been added to the guestbook.
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !name.trim() || !message.trim()}
              className="w-full px-4 py-2.5 rounded-lg bg-black dark:bg-white text-white dark:text-black text-[15px] font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black/90 dark:hover:bg-white/90 transition-colors active:scale-[0.98]"
            >
              {submitting ? "Submitting..." : "Submit"}
            </button>
          </form>

          {/* Entries */}
          <div>
            <h2 className="text-xl font-medium mb-6 text-black/90 dark:text-white/90">
              {loading ? "Loading..." : `${entries.length} ${entries.length === 1 ? "entry" : "entries"}`}
            </h2>

            {loading ? (
              <div className="text-[15px] text-black/50 dark:text-white/50">
                Loading entries...
              </div>
            ) : entries.length === 0 ? (
              <div className="text-[15px] text-black/50 dark:text-white/50 py-8">
                No entries yet. Be the first to leave a note!
              </div>
            ) : (
              <div className="space-y-6">
                {entries.map((entry) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: smoothEase }}
                    className="p-5 rounded-lg bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.06]"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="font-medium text-[15px] text-black/90 dark:text-white/90">
                        {entry.name}
                      </div>
                      <time
                        className="text-[13px] text-black/50 dark:text-white/50 shrink-0"
                        dateTime={entry.createdAt}
                      >
                        {formatDate(entry.createdAt)}
                      </time>
                    </div>
                    <p className="text-[15px] leading-[1.6] text-black/80 dark:text-white/80 whitespace-pre-wrap">
                      {entry.message}
                    </p>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </main>
      </motion.div>
    </div>
  );
}
