"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDuration, formatRelativeTime, getBuiltAt, getBuildForModel, type Manifest } from "@/lib/manifest";
import { FadeShimmerText } from "./fade-shimmer-text";
import { useIsMobile } from "@/lib/use-media-query";

type RouteType = "/" | "/agent" | "/new" | "/builds" | "/posts";

interface ManualVersionData {
  lastUpdated: string;
}

interface BuildTimeProps {
  currentRoute: RouteType;
  manifest?: Manifest | null;
  currentModel?: string | null;
  currentDate?: string | null;
  currentTimestamp?: string | null;
}

export function BuildTime({ currentRoute, manifest, currentModel, currentDate, currentTimestamp }: BuildTimeProps) {
  const [relativeTime, setRelativeTime] = useState<string>("");
  const [manualVersionDate, setManualVersionDate] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const isHome = currentRoute === "/";
  const isAgent = currentRoute === "/agent";

  // Fetch manual version date for Erik's version
  useEffect(() => {
    if (!isHome) return;

    fetch("/data/manual-version.json")
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data: ManualVersionData) => {
        setManualVersionDate(data.lastUpdated);
      })
      .catch(() => setManualVersionDate(null));
  }, [isHome]);

  // Update relative time for manual version
  useEffect(() => {
    if (!isHome || !manualVersionDate) return;

    const updateTime = () => {
      setRelativeTime(formatRelativeTime(manualVersionDate));
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [isHome, manualVersionDate]);

  // Update relative time for agent version
  useEffect(() => {
    if (!isAgent || !manifest) return;

    const builtAt = getBuiltAt(manifest, currentDate ?? undefined, currentTimestamp ?? undefined);
    if (!builtAt) return;

    const updateTime = () => {
      setRelativeTime(formatRelativeTime(builtAt));
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [isAgent, manifest, currentDate, currentTimestamp]);

  // Don't render on /new page
  if (currentRoute === "/new") return null;

  if (!relativeTime) return null;

  const displayModel = currentModel || manifest?.default_model;
  const displayDate = currentDate || manifest?.latest_date;
  const currentBuild = manifest && displayModel && displayDate
    ? getBuildForModel(manifest, displayModel, displayDate, currentTimestamp ?? undefined)
    : null;

  const durationStr = currentBuild?.duration_ms ? formatDuration(currentBuild.duration_ms) : "";

  // Home page: just informational text, no link, with fade-shimmer animation
  if (isHome) {
    return (
      <span className="hidden items-center px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted)] sm:flex">
        <FadeShimmerText text={`Updated ${relativeTime}`} delay={150} />
      </span>
    );
  }

  // Agent page: link to builds with fade-shimmer animation
  // Mobile: just show build duration; Desktop: show relative time + duration
  const agentDisplayText = isMobile
    ? (durationStr ? `Built in ${durationStr}` : `Built ${relativeTime}`)
    : (durationStr ? `Built ${relativeTime} in ${durationStr}` : `Built ${relativeTime}`);

  return (
    <Link
      href="/builds"
      className="hidden items-center px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)] sm:flex whitespace-nowrap"
    >
      <FadeShimmerText text={agentDisplayText} delay={150} />
    </Link>
  );
}
