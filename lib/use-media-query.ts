"use client";

import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  // Initialize with the actual value if available (client-side)
  const getInitialValue = () => {
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  };

  const [matches, setMatches] = useState(getInitialValue);

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    // Update immediately in case SSR value differs
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

