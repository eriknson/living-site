"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDuration, formatRelativeTime, getBuiltAt, getBuildForModel, type Manifest } from "@/lib/manifest";
import { FadeShimmerText } from "./fade-shimmer-text";
import { useIsMobile } from "@/lib/use-media-query";

type RouteType = "/" | "/agent" | "/new" | "/builds" | "/posts" | "/play";

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
  const isPlay = currentRoute === "/play";

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

  // Update relative time for agent/play version
  useEffect(() => {
    if ((!isAgent && !isPlay) || !manifest) return;

    const builtAt = getBuiltAt(manifest, currentDate ?? undefined, currentTimestamp ?? undefined);
    if (!builtAt) return;

    const updateTime = () => {
      setRelativeTime(formatRelativeTime(builtAt));
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [isAgent, isPlay, manifest, currentDate, currentTimestamp]);

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
      <span className="h-full px-2 text-tertiary flex items-center select-text whitespace-nowrap">
        <FadeShimmerText 
          text={`Updated ${relativeTime}`} 
          delay={150} 
        />
      </span>
    );
  }

  const agentDisplayText = isMobile
    ? (durationStr ? `Built in ${durationStr}` : `Built ${relativeTime}`)
    : (durationStr ? `Built ${relativeTime} in ${durationStr}` : `Built ${relativeTime}`);

  return (
    <Link 
      href="/builds"
      className="h-full px-2 text-tertiary hover:text-secondary flex items-center transition-colors whitespace-nowrap"
    >
      <FadeShimmerText 
        text={agentDisplayText} 
        delay={150} 
      />
    </Link>
  );
}
