"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import { ArrowLeft, ChevronDown } from "lucide-react";
import type { Manifest } from "@/lib/manifest";
import {
  getSameBatchModels,
  getModelDisplayName,
  getBatch,
} from "@/lib/manifest";

// Simple back button component for /new and /builds pages
// Falls back to home if there's no history (direct entry to subpage)
function BackButton() {
  const router = useRouter();
  
  const handleBack = () => {
    track("back_button_clicked");
    
    // Check if we have meaningful history to go back to
    // history.length > 1 means there's at least one previous entry
    // Also check if referrer is from our own site (same origin)
    const hasHistory = typeof window !== "undefined" && window.history.length > 1;
    const referrerIsInternal = typeof document !== "undefined" && 
      document.referrer && 
      document.referrer.startsWith(window.location.origin);
    
    if (hasHistory && referrerIsInternal) {
      router.back();
    } else {
      // No history or came from external site - go home
      router.push("/");
    }
  };

  return (
    <button
      onClick={handleBack}
      className="flex items-center cursor-pointer h-8 px-3 rounded-full bg-black/[0.03] dark:bg-white/[0.06] active:bg-black/[0.08] dark:active:bg-white/[0.12] transition-colors select-none"
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      aria-label="Go back"
    >
      <span className="flex items-center gap-1.5">
        <ArrowLeft className="h-[1em] w-[1em] opacity-50" strokeWidth={2} />
        <span>Back</span>
      </span>
    </button>
  );
}

type RouteType = "/" | "/agent" | "/new" | "/builds" | "/posts" | "/play";

interface VersionSelectorProps {
  manifest?: Manifest | null;
  currentRoute: RouteType;
  currentModel?: string | null;
  currentDate?: string | null;
  currentTimestamp?: string | null;
  onModelChange?: (model: string) => void;
}

export function VersionSelector({
  manifest: providedManifest,
  currentRoute,
  currentModel,
  currentDate,
  currentTimestamp,
  onModelChange,
}: VersionSelectorProps) {
  const router = useRouter();
  const [fetchedManifest, setFetchedManifest] = useState<Manifest | null>(null);

  // Use provided manifest or fetch it
  const manifest = providedManifest ?? fetchedManifest;

  // Fetch manifest if not provided (for home page or when no provider)
  useEffect(() => {
    if (providedManifest) return;

    const manifestUrl = currentRoute === "/play" ? "/games/manifest.json" : "/builds/manifest.json";
    fetch(manifestUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data: Manifest) => {
        setFetchedManifest(data);
      })
      .catch(() => {});
  }, [providedManifest, currentRoute]);

  // Prefetch agent build HTML files from home page for faster navigation
  useEffect(() => {
    // Only prefetch when on home page
    if (currentRoute !== "/" || !manifest) return;

    const batch = getBatch(manifest);
    if (!batch) return;

    const links: HTMLLinkElement[] = [];
    batch.builds
      .filter((b) => b.status === "success")
      .forEach(({ path }) => {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.href = `/${path}`;
        link.as = "document";
        document.head.appendChild(link);
        links.push(link);
      });

    return () => links.forEach((link) => link.remove());
  }, [manifest, currentRoute]);

  const displayDate = currentDate || manifest?.latest_date;
  const displayTimestamp = currentTimestamp || manifest?.latest_timestamp;
  const sameBatchModels = manifest
    ? getSameBatchModels(manifest, displayDate || undefined, displayTimestamp || undefined)
    : [];

  const isHome = currentRoute === "/";
  const isAgent = currentRoute === "/agent";
  const isPlay = currentRoute === "/play";
  const isNew = currentRoute === "/new";
  const isBuilds = currentRoute === "/builds";

  if (isNew || isBuilds || currentRoute === "/posts") {
    return <BackButton />;
  }

  const getDisplayName = () => {
    if (isHome) return "Erik";
    if ((isAgent || isPlay) && currentModel) {
      if (currentModel === "gpt-5.5-extra-high") {
        return (
          <>
            <span className="sm:hidden">GPT-5.5</span>
            <span className="hidden sm:inline">GPT-5.5 1M Extra High</span>
          </>
        );
      }
      if (currentModel === "gpt-5.4-high-fast") {
        return (
          <>
            <span className="sm:hidden">GPT-5.4</span>
            <span className="hidden sm:inline">GPT-5.4 High Fast</span>
          </>
        );
      }
      return getModelDisplayName(currentModel);
    }
    return "Select version";
  };

  const getCurrentValue = () => {
    if (isHome) return "erik";
    if ((isAgent || isPlay) && currentModel) return currentModel;
    return "erik";
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    
    if (value === "erik") {
      track("version_switched", { version: "erik", from: currentRoute });
      router.push("/");
    } else if (value === "new") {
      track("generate_new_clicked", { from: currentRoute });
      router.push("/new");
    } else {
      track("version_switched", { version: value, from: currentRoute });
      if ((isAgent || isPlay) && onModelChange) {
        onModelChange(value);
      } else {
        router.push(`/agent?model=${value}`);
      }
    }
  };

  return (
    <label 
      className="relative flex items-center cursor-pointer h-8 px-3 rounded-full bg-black/[0.03] dark:bg-white/[0.06] active:bg-black/[0.08] dark:active:bg-white/[0.12] transition-colors select-none"
      style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Visual display (non-interactive) */}
      <span className="flex items-center gap-1.5 pointer-events-none">
        <span className="whitespace-nowrap">{getDisplayName()}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
      </span>
      
      {/* Native select overlay */}
      <select
        value={getCurrentValue()}
        onChange={handleChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        aria-label="Select version"
      >
        <option value="erik">Erik</option>
        {sameBatchModels.map((build) => (
          <option key={build.model} value={build.model}>
            {getModelDisplayName(build.model)}
          </option>
        ))}
      </select>
    </label>
  );
}
