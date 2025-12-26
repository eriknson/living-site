"use client";

import { useEffect } from "react";

interface TwitterWindow extends Window {
  twttr?: {
    widgets?: {
      load?: (element?: HTMLElement) => void;
    };
    ready?: (callback: () => void) => void;
  };
}

export function TwitterEmbedLoader({ hasTwitterEmbed }: { hasTwitterEmbed: boolean }) {
  useEffect(() => {
    if (!hasTwitterEmbed) return;

    const loadTwitterWidgets = () => {
      // Get current theme based on system preference
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const theme = isDark ? "dark" : "light";

      // Update data-theme on all Twitter blockquotes
      const blockquotes = document.querySelectorAll("blockquote.twitter-tweet");
      if (blockquotes.length === 0) {
        // No blockquotes yet, try again
        return false;
      }

      blockquotes.forEach((bq) => {
        bq.setAttribute("data-theme", theme);
      });

      const twttr = (window as TwitterWindow).twttr;

      // If Twitter widgets are already loaded, refresh
      if (twttr?.widgets?.load) {
        twttr.widgets.load();
        return true;
      }

      return false;
    };

    const loadScript = () => {
      // Check if script already exists
      const existingScript = document.querySelector('script[src*="platform.twitter.com/widgets.js"]');
      if (existingScript) {
        return;
      }

      // Load the script
      const script = document.createElement("script");
      script.src = "https://platform.twitter.com/widgets.js";
      script.async = true;
      script.charset = "utf-8";
      document.body.appendChild(script);
    };

    // Try to load widgets immediately, or wait for script
    const attemptLoad = () => {
      if (!loadTwitterWidgets()) {
        // Script not ready yet, poll for it
        const pollInterval = setInterval(() => {
          if (loadTwitterWidgets()) {
            clearInterval(pollInterval);
          }
        }, 100);

        // Stop polling after 15 seconds
        setTimeout(() => clearInterval(pollInterval), 15000);
      }
    };

    // Load the script first
    loadScript();

    // Wait for DOM and script to be ready
    // Use a small delay to ensure Next.js hydration is complete
    const timeoutId = setTimeout(attemptLoad, 100);

    // Also listen for twttr ready event
    const checkTwttr = setInterval(() => {
      const twttr = (window as TwitterWindow).twttr;
      if (twttr?.ready) {
        clearInterval(checkTwttr);
        twttr.ready(() => {
          loadTwitterWidgets();
        });
      }
    }, 50);

    // Cleanup
    setTimeout(() => clearInterval(checkTwttr), 15000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(checkTwttr);
    };
  }, [hasTwitterEmbed]);

  return null;
}
