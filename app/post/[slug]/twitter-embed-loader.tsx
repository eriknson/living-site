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

    const loadTwitter = () => {
      // Get current theme based on system preference
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const theme = isDark ? "dark" : "light";

      // Update data-theme on all Twitter blockquotes
      const blockquotes = document.querySelectorAll("blockquote.twitter-tweet");
      blockquotes.forEach((bq) => {
        bq.setAttribute("data-theme", theme);
      });

      const twttr = (window as TwitterWindow).twttr;

      // If Twitter widgets are already loaded, refresh
      if (twttr?.widgets?.load) {
        twttr.widgets.load();
        return;
      }

      // Check if script is already loading
      if (document.querySelector('script[src*="platform.twitter.com/widgets.js"]')) {
        // Script exists, wait for twttr to be ready
        const checkReady = setInterval(() => {
          const tw = (window as TwitterWindow).twttr;
          if (tw?.widgets?.load) {
            clearInterval(checkReady);
            tw.widgets.load();
          }
        }, 100);
        // Clear after 10 seconds
        setTimeout(() => clearInterval(checkReady), 10000);
        return;
      }

      // Load the script
      const script = document.createElement("script");
      script.src = "https://platform.twitter.com/widgets.js";
      script.async = true;
      script.charset = "utf-8";
      script.onload = () => {
        // Wait for twttr to initialize
        const tw = (window as TwitterWindow).twttr;
        if (tw?.ready) {
          tw.ready(() => {
            tw.widgets?.load?.();
          });
        }
      };
      document.body.appendChild(script);
    };

    // Wait for next frame to ensure DOM is ready
    requestAnimationFrame(() => {
      requestAnimationFrame(loadTwitter);
    });
  }, [hasTwitterEmbed]);

  return null;
}
