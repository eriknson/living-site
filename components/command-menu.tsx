"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Command } from "cmdk";
import * as Dialog from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import {
  Home,
  Zap,
  Sparkles,
  History,
  ExternalLink,
  Mail,
  FileText,
  BookOpen,
  Activity,
  Gamepad2,
} from "lucide-react";
import { SearchIcon } from "@/components/icons/search-icon";
import { useIsMobile } from "@/lib/use-media-query";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { modelDisplayNames, modelSlugs, formatDuration, type Manifest } from "@/lib/manifest";
import type { PostMeta } from "@/lib/posts";

const SHOW_PLAY_IN_COMMAND_MENU = false;

const PAGES = [
  { path: "/", label: "Home", icon: Home, keywords: ["start", "main", "erik"] },
  {
    path: "/posts",
    label: "Posts",
    icon: BookOpen,
    keywords: ["articles", "blog", "writing", "essays"],
  },
  {
    path: "/new",
    label: "Generate",
    icon: Sparkles,
    keywords: ["create", "build", "new"],
  },
  {
    path: "/play",
    label: "Play",
    icon: Gamepad2,
    keywords: ["game", "games", "play", "fun"],
  },
  {
    path: "/builds",
    label: "Build History",
    icon: History,
    keywords: ["builds", "history", "past", "archive"],
  },
  {
    path: "/activity",
    label: "Activity",
    icon: Activity,
    keywords: ["github", "contributions", "activity", "stats", "charts"],
  },
];

const COMMAND_PAGES = SHOW_PLAY_IN_COMMAND_MENU
  ? PAGES
  : PAGES.filter((page) => page.path !== "/play");

// Agent models - each links to /agent?model=<slug>
const AGENTS = [
  {
    modelId: "cursor-grok-4.5-high-fast",
    keywords: ["cursor", "xai", "grok", "4.5", "fast", "ai"],
  },
  {
    modelId: "gpt-5.6-sol-xhigh",
    keywords: ["openai", "gpt", "5.6", "sol", "extra", "high", "ai"],
  },
  {
    modelId: "claude-fable-5-thinking-max",
    keywords: ["claude", "anthropic", "fable", "5", "thinking", "max", "ai"],
  },
  {
    modelId: "gemini-3.6-flash-high",
    keywords: ["google", "gemini", "3.6", "flash", "ai"],
  },
  {
    modelId: "composer-2.5-fast",
    keywords: ["cursor", "composer", "2.5", "fast", "ai"],
  },
  {
    modelId: "gpt-5.5-extra-high",
    keywords: ["openai", "gpt", "5.5", "extra", "high", "ai"],
  },
  {
    modelId: "claude-opus-4-8-thinking-max-fast",
    keywords: ["claude", "anthropic", "opus", "4.8", "thinking", "max", "fast", "ai"],
  },
  {
    modelId: "gemini-3.1-pro",
    keywords: ["google", "gemini", "3.1", "pro", "ai"],
  },
].map((agent) => ({
  ...agent,
  label: modelDisplayNames[agent.modelId] || agent.modelId,
  path: `/agent?model=${modelSlugs[agent.modelId] || agent.modelId}`,
}));

const GAME_AGENTS = [
  {
    modelId: "cursor-grok-4.5-high-fast",
    keywords: ["cursor", "xai", "grok", "4.5", "fast", "game", "play"],
  },
  {
    modelId: "gpt-5.6-sol-xhigh",
    keywords: ["openai", "gpt", "5.6", "sol", "extra", "high", "game", "play"],
  },
  {
    modelId: "claude-fable-5-thinking-max",
    keywords: ["claude", "anthropic", "fable", "5", "thinking", "max", "game", "play"],
  },
  {
    modelId: "gemini-3.6-flash-high",
    keywords: ["google", "gemini", "3.6", "flash", "game", "play"],
  },
  {
    modelId: "composer-2.5-fast",
    keywords: ["cursor", "composer", "2.5", "fast", "game", "play"],
  },
  {
    modelId: "gpt-5.5-extra-high",
    keywords: ["openai", "gpt", "5.5", "extra", "high", "game", "play"],
  },
  {
    modelId: "claude-opus-4-8-thinking-max-fast",
    keywords: ["claude", "anthropic", "opus", "4.8", "thinking", "max", "fast", "game", "play"],
  },
  {
    modelId: "gemini-3.1-pro",
    keywords: ["google", "gemini", "3.1", "pro", "game", "play"],
  },
].map((agent) => ({
  ...agent,
  label: modelDisplayNames[agent.modelId] || agent.modelId,
  path: `/play?model=${modelSlugs[agent.modelId] || agent.modelId}`,
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
    href: "mailto:contact@eriks.design?subject=Hej",
    label: "Email",
    keywords: ["contact", "mail", "message"],
  },
];

interface CommandMenuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// The dialog/drawer content - lazy loaded
export default function CommandMenuDialog({ open, onOpenChange }: CommandMenuDialogProps) {
  const [posts, setPosts] = useState<PostMeta[]>([]);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();

  // Fetch posts and manifest when component mounts (after lazy load)
  useEffect(() => {
    fetch("/api/posts")
      .then((res) => res.json())
      .then((data) => setPosts(data.posts || []))
      .catch(() => {});

    fetch("/builds/manifest.json")
      .then((res) => res.json())
      .then((data) => setManifest(data))
      .catch(() => {});
  }, []);

  // Get build duration for a model from the latest batch
  const getBuildDuration = useCallback((modelId: string): number | undefined => {
    if (!manifest?.dates?.length) return undefined;
    const latestDate = manifest.dates[0];
    if (!latestDate?.batches?.length) return undefined;
    const latestBatch = latestDate.batches[0];
    const build = latestBatch.builds.find(b => b.model === modelId && b.status === "success");
    return build?.duration_ms;
  }, [manifest]);

  // Helper to check if a path matches the current pathname
  const isCurrentPath = useCallback(
    (path: string) => {
      if (path === "/") return pathname === "/";
      // Handle query params in path (e.g., /agent?model=xxx)
      const [pathWithoutQuery] = path.split("?");
      return pathname === pathWithoutQuery || pathname.startsWith(pathWithoutQuery + "/");
    },
    [pathname]
  );

  const runCommand = useCallback(
    (command: () => void) => {
      onOpenChange(false);
      command();
    },
    [onOpenChange]
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

  // Shared Command content (search + results)
  const commandContent = (
    <Command className="flex flex-col" label="Global Command Menu">
      {/* Search Input */}
      <div className="flex items-center gap-3 px-4 border-b border-subtle">
        <SearchIcon className="h-4 w-4 text-tertiary shrink-0" />
        <Command.Input
          autoFocus={!isMobile}
          placeholder="Search"
          className="flex-1 h-12 bg-transparent text-base text-primary placeholder:text-tertiary outline-none"
        />
      </div>

      {/* Results */}
      <Command.List className={`overflow-y-auto p-2 scroll-smooth ${isMobile ? "max-h-[50vh]" : "max-h-[min(60vh,400px)]"}`}>
        <Command.Empty className="py-6 text-center text-sm text-secondary">
          No results found.
        </Command.Empty>

        {/* Pages Group */}
        <Command.Group
          heading="Pages"
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-tertiary [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide"
        >
          {COMMAND_PAGES.map((page) => {
            const isCurrent = isCurrentPath(page.path);
            return (
              <Command.Item
                key={page.path}
                value={page.label}
                keywords={page.keywords}
                onSelect={() => navigateTo(page.path)}
                className={`flex items-center gap-3 px-3 rounded-lg cursor-pointer text-sm data-[selected=true]:bg-hover outline-none transition-colors active:bg-black/[0.08] dark:active:bg-white/[0.12] ${isMobile ? "py-3.5" : "py-2.5"} ${isCurrent ? "text-primary font-medium" : "text-primary"}`}
              >
                <page.icon className={`h-4 w-4 ${isCurrent ? "opacity-100" : "opacity-60"}`} />
                <span className="flex-1">{page.label}</span>
                {isCurrent && (
                  <span className="text-[11px] text-tertiary font-normal">Current</span>
                )}
              </Command.Item>
            );
          })}
        </Command.Group>

        {/* Articles Group */}
        {posts.length > 0 && (
          <Command.Group
            heading="Articles"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-tertiary [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:mt-2"
          >
            {posts.map((post) => {
              const postPath = post.externalUrl ? post.externalUrl : `/posts/${post.slug}`;
              const isCurrent = !post.externalUrl && pathname === `/posts/${post.slug}`;
              const isExternal = !!post.externalUrl;
              return (
                <Command.Item
                  key={post.slug}
                  value={post.title}
                  keywords={[post.slug, "article", "post", "blog"]}
                  onSelect={() => isExternal ? openExternal(postPath) : navigateTo(postPath)}
                  className={`flex items-center gap-3 px-3 rounded-lg cursor-pointer text-sm data-[selected=true]:bg-hover outline-none transition-colors active:bg-black/[0.08] dark:active:bg-white/[0.12] ${isMobile ? "py-3.5" : "py-2.5"} ${isCurrent ? "text-primary font-medium" : "text-primary"}`}
                >
                  {isExternal ? (
                    <ExternalLink className={`h-4 w-4 ${isCurrent ? "opacity-100" : "opacity-60"}`} />
                  ) : (
                    <FileText className={`h-4 w-4 ${isCurrent ? "opacity-100" : "opacity-60"}`} />
                  )}
                  <span className="flex-1 truncate">
                    {post.title}
                    {post.readTime && (
                      <span className="text-[11px] text-tertiary font-normal ml-1.5">{post.readTime} min</span>
                    )}
                  </span>
                  {isCurrent && (
                    <span className="text-[11px] text-tertiary font-normal shrink-0">Current</span>
                  )}
                </Command.Item>
              );
            })}
          </Command.Group>
        )}

        {/* Agents Group */}
        <Command.Group
          heading="Made by agents"
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-tertiary [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:mt-2"
        >
          {AGENTS.map((agent) => {
            const isCurrent = isCurrentPath(agent.path);
            const buildDuration = getBuildDuration(agent.modelId);
            return (
              <Command.Item
                key={agent.modelId}
                value={agent.label}
                keywords={agent.keywords}
                onSelect={() => navigateTo(agent.path)}
                className={`flex items-center gap-3 px-3 rounded-lg cursor-pointer text-sm data-[selected=true]:bg-hover outline-none transition-colors active:bg-black/[0.08] dark:active:bg-white/[0.12] ${isMobile ? "py-3.5" : "py-2.5"} ${isCurrent ? "text-primary font-medium" : "text-primary"}`}
              >
                <Zap className={`h-4 w-4 ${isCurrent ? "opacity-100" : "opacity-60"}`} />
                <span className="flex-1">
                  {agent.label}
                  {buildDuration && (
                    <span className="text-[11px] text-tertiary font-normal ml-1.5">Built in {formatDuration(buildDuration)}</span>
                  )}
                </span>
                {isCurrent && (
                  <span className="text-[11px] text-tertiary font-normal shrink-0">Current</span>
                )}
              </Command.Item>
            );
          })}
        </Command.Group>

        {/* Game entries stay hidden until /play is ready to launch. */}
        {SHOW_PLAY_IN_COMMAND_MENU && (
          <Command.Group
            heading="Games by agents"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-tertiary [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:mt-2"
          >
            {GAME_AGENTS.map((agent) => {
              const isCurrent = isCurrentPath(agent.path);
              return (
                <Command.Item
                  key={`game-${agent.modelId}`}
                  value={`${agent.label} game`}
                  keywords={agent.keywords}
                  onSelect={() => navigateTo(agent.path)}
                  className={`flex items-center gap-3 px-3 rounded-lg cursor-pointer text-sm data-[selected=true]:bg-hover outline-none transition-colors active:bg-black/[0.08] dark:active:bg-white/[0.12] ${isMobile ? "py-3.5" : "py-2.5"} ${isCurrent ? "text-primary font-medium" : "text-primary"}`}
                >
                  <Gamepad2 className={`h-4 w-4 ${isCurrent ? "opacity-100" : "opacity-60"}`} />
                  <span className="flex-1">{agent.label}</span>
                  {isCurrent && (
                    <span className="text-[11px] text-tertiary font-normal shrink-0">Current</span>
                  )}
                </Command.Item>
              );
            })}
          </Command.Group>
        )}

        {/* External Links Group */}
        <Command.Group
          heading="Links"
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[12px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-tertiary [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:mt-2"
        >
          {EXTERNAL_LINKS.map((link) => (
            <Command.Item
              key={link.href}
              value={link.label}
              keywords={link.keywords}
              onSelect={() => openExternal(link.href)}
              className={`flex items-center gap-3 px-3 rounded-lg cursor-pointer text-sm text-primary data-[selected=true]:bg-hover outline-none transition-colors active:bg-black/[0.08] dark:active:bg-white/[0.12] ${isMobile ? "py-3.5" : "py-2.5"}`}
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
        <div className="px-4 py-2.5 border-t border-subtle flex items-center justify-between text-[12px] text-tertiary">
          <span>Navigate with ↑↓ · Select with ↵</span>
          <span>ESC to close</span>
        </div>
      )}
    </Command>
  );

  // Mobile: Use Vaul Drawer (bottom sheet)
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
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
    );
  }

  // Desktop: Use Command.Dialog (centered modal)
  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
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
        onClick={() => onOpenChange(false)}
      />

      {/* Panel */}
      <div className="fixed left-1/2 top-[20%] -translate-x-1/2 w-[calc(100%-2rem)] max-w-[480px] bg-page rounded-xl shadow-2xl border border-subtle overflow-hidden">
        {commandContent}
      </div>
    </Command.Dialog>
  );
}
