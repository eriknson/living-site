"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  Home,
  Zap,
  Sparkles,
  History,
  FileText,
  ExternalLink,
  Mail,
} from "lucide-react";
import { SearchIcon } from "@/components/icons/search-icon";
import { useIsMobile } from "@/lib/use-media-query";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { modelDisplayNames, modelSlugs } from "@/lib/manifest";

// Posts data - could be fetched dynamically but hardcoded for simplicity
const POSTS = [
  { slug: "familiar-differentiation", title: "Familiar differentiation" },
  {
    slug: "shower-thought-principles-for-designing-in-web3",
    title: "Shower-thought principles for designing in web3",
  },
];

const PAGES = [
  { path: "/", label: "Home", icon: Home, keywords: ["start", "main", "erik"] },
  {
    path: "/new",
    label: "Generate",
    icon: Sparkles,
    keywords: ["create", "build", "new"],
  },
  {
    path: "/builds",
    label: "Builds",
    icon: History,
    keywords: ["history", "past", "archive"],
  },
  {
    path: "/posts",
    label: "Posts",
    icon: FileText,
    keywords: ["blog", "articles", "writing"],
  },
];

// Agent models - each links to /agent?model=<slug>
const AGENTS = [
  {
    modelId: "claude-4.5-opus-high-thinking",
    keywords: ["claude", "anthropic", "opus", "ai"],
  },
  {
    modelId: "composer-1",
    keywords: ["cursor", "composer", "ai"],
  },
  {
    modelId: "gemini-3-pro",
    keywords: ["google", "gemini", "ai"],
  },
  {
    modelId: "gpt-5.1-codex",
    keywords: ["openai", "gpt", "codex", "ai"],
  },
].map((agent) => ({
  ...agent,
  label: modelDisplayNames[agent.modelId] || agent.modelId,
  path: `/agent?model=${modelSlugs[agent.modelId] || agent.modelId}`,
}));

const EXTERNAL_LINKS = [
  {
    href: "https://x.com/flowstated",
    label: "X (@flowstated)",
    keywords: ["twitter", "social"],
  },
  {
    href: "https://github.com/eriknson",
    label: "GitHub",
    keywords: ["code", "repos", "source"],
  },
  {
    href: "mailto:contact@eriks.design",
    label: "Email",
    keywords: ["contact", "mail", "message"],
  },
];

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const isMobile = useIsMobile();

  // Global keyboard listener for ⌘K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = useCallback(
    (command: () => void) => {
      setOpen(false);
      command();
    },
    []
  );

  const navigateTo = useCallback(
    (path: string) => {
      runCommand(() => router.push(path));
    },
    [router, runCommand]
  );

  const openExternal = useCallback(
    (href: string) => {
      runCommand(() => window.open(href, "_blank", "noopener,noreferrer"));
    },
    [runCommand]
  );

  // Shared trigger button
  const triggerButton = (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-black/[0.03] dark:bg-white/[0.06] active:bg-black/[0.08] dark:active:bg-white/[0.12] transition-colors select-none cursor-pointer"
      style={{
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
      aria-label="Open command menu"
    >
      <SearchIcon className="h-[1em] w-[1em] opacity-50" />
      {!isMobile && (
        <span className="text-black/40 dark:text-white/40 text-[0.85em]">
          ⌘K
        </span>
      )}
    </button>
  );

  // Shared Command content (search + results)
  const commandContent = (
    <Command className="flex flex-col" label="Global Command Menu">
      {/* Search Input */}
      <div className="flex items-center gap-3 px-4 border-b border-black/[0.06] dark:border-white/[0.06]">
        <SearchIcon className="h-4 w-4 text-black/40 dark:text-white/40 shrink-0" />
        <Command.Input
          autoFocus={!isMobile}
          placeholder="Type to search..."
          className="flex-1 h-12 bg-transparent text-[15px] text-[#1a1a1a] dark:text-[#e5e5e5] placeholder:text-black/40 dark:placeholder:text-white/40 outline-none"
        />
      </div>

      {/* Results */}
      <Command.List className={`overflow-y-auto p-2 scroll-smooth ${isMobile ? "max-h-[50vh]" : "max-h-[min(60vh,400px)]"}`}>
        <Command.Empty className="py-6 text-center text-[14px] text-black/50 dark:text-white/50">
          No results found.
        </Command.Empty>

        {/* Pages Group */}
        <Command.Group
          heading="Pages"
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-black/40 [&_[cmdk-group-heading]]:dark:text-white/40 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide"
        >
          {PAGES.map((page) => (
            <Command.Item
              key={page.path}
              value={page.label}
              keywords={page.keywords}
              onSelect={() => navigateTo(page.path)}
              className={`flex items-center gap-3 px-3 rounded-lg cursor-pointer text-[14px] text-[#1a1a1a] dark:text-[#e5e5e5] data-[selected=true]:bg-black/[0.05] dark:data-[selected=true]:bg-white/[0.08] outline-none transition-colors active:bg-black/[0.08] dark:active:bg-white/[0.12] ${isMobile ? "py-3.5" : "py-2.5"}`}
            >
              <page.icon className="h-4 w-4 opacity-60" />
              <span>{page.label}</span>
            </Command.Item>
          ))}
        </Command.Group>

        {/* Agents Group */}
        <Command.Group
          heading="Agents"
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-black/40 [&_[cmdk-group-heading]]:dark:text-white/40 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:mt-2"
        >
          {AGENTS.map((agent) => (
            <Command.Item
              key={agent.modelId}
              value={agent.label}
              keywords={agent.keywords}
              onSelect={() => navigateTo(agent.path)}
              className={`flex items-center gap-3 px-3 rounded-lg cursor-pointer text-[14px] text-[#1a1a1a] dark:text-[#e5e5e5] data-[selected=true]:bg-black/[0.05] dark:data-[selected=true]:bg-white/[0.08] outline-none transition-colors active:bg-black/[0.08] dark:active:bg-white/[0.12] ${isMobile ? "py-3.5" : "py-2.5"}`}
            >
              <Zap className="h-4 w-4 opacity-60" />
              <span>{agent.label}</span>
            </Command.Item>
          ))}
        </Command.Group>

        {/* Posts Group */}
        <Command.Group
          heading="Posts"
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-black/40 [&_[cmdk-group-heading]]:dark:text-white/40 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:mt-2"
        >
          {POSTS.map((post) => (
            <Command.Item
              key={post.slug}
              value={post.title}
              keywords={["blog", "article", "post"]}
              onSelect={() => navigateTo(`/post/${post.slug}`)}
              className={`flex items-center gap-3 px-3 rounded-lg cursor-pointer text-[14px] text-[#1a1a1a] dark:text-[#e5e5e5] data-[selected=true]:bg-black/[0.05] dark:data-[selected=true]:bg-white/[0.08] outline-none transition-colors active:bg-black/[0.08] dark:active:bg-white/[0.12] ${isMobile ? "py-3.5" : "py-2.5"}`}
            >
              <FileText className="h-4 w-4 opacity-60" />
              <span className="truncate">{post.title}</span>
            </Command.Item>
          ))}
        </Command.Group>

        {/* External Links Group */}
        <Command.Group
          heading="Links"
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-black/40 [&_[cmdk-group-heading]]:dark:text-white/40 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:mt-2"
        >
          {EXTERNAL_LINKS.map((link) => (
            <Command.Item
              key={link.href}
              value={link.label}
              keywords={link.keywords}
              onSelect={() => openExternal(link.href)}
              className={`flex items-center gap-3 px-3 rounded-lg cursor-pointer text-[14px] text-[#1a1a1a] dark:text-[#e5e5e5] data-[selected=true]:bg-black/[0.05] dark:data-[selected=true]:bg-white/[0.08] outline-none transition-colors active:bg-black/[0.08] dark:active:bg-white/[0.12] ${isMobile ? "py-3.5" : "py-2.5"}`}
            >
              {link.href.startsWith("mailto:") ? (
                <Mail className="h-4 w-4 opacity-60" />
              ) : (
                <ExternalLink className="h-4 w-4 opacity-60" />
              )}
              <span>{link.label}</span>
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>

      {/* Footer hint - only on desktop */}
      {!isMobile && (
        <div className="px-4 py-2.5 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between text-[12px] text-black/40 dark:text-white/40">
          <span>Navigate with ↑↓ · Select with ↵</span>
          <span>ESC to close</span>
        </div>
      )}
    </Command>
  );

  // Mobile: Use Vaul Drawer (bottom sheet)
  if (isMobile) {
    return (
      <>
        {triggerButton}
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent aria-label="Command Menu">
            {/* Override the default visually hidden title with our own */}
            <VisuallyHidden.Root asChild>
              <DrawerTitle>Command Menu</DrawerTitle>
            </VisuallyHidden.Root>
            {commandContent}
            {/* Safe area padding for devices with home indicator */}
            <div className="h-[env(safe-area-inset-bottom,0px)]" />
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Desktop: Use Command.Dialog (centered modal)
  return (
    <>
      {triggerButton}
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Global Command Menu"
        className="fixed inset-0 z-[100]"
      >
        {/* Visually hidden title and description for screen readers */}
        <VisuallyHidden.Root asChild>
          <Dialog.Title>Command Menu</Dialog.Title>
        </VisuallyHidden.Root>
        <VisuallyHidden.Root asChild>
          <Dialog.Description>
            Search and navigate to any page on the site
          </Dialog.Description>
        </VisuallyHidden.Root>

        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />

        {/* Panel */}
        <div className="fixed left-1/2 top-[20%] -translate-x-1/2 w-[calc(100%-2rem)] max-w-[480px] bg-[#fafaf9] dark:bg-[#0a0a0a] rounded-xl shadow-2xl border border-black/[0.08] dark:border-white/[0.08] overflow-hidden">
          {commandContent}
        </div>
      </Command.Dialog>
    </>
  );
}
