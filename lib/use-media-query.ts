"use client";

import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  // Always initialize with false to match server render and avoid hydration mismatch
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    // Set the actual value after hydration
    setMatches(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

export function useIsMobile(): boolean {
  return !useMediaQuery("(min-width: 640px)");
}

