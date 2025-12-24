"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Rewrites CSS selectors targeting `body` to also target `.shadow-root`
 * This ensures body-level styles apply correctly in Shadow DOM
 */
function rewriteBodySelectors(css: string): string {
  return css
    // body { ... } → body, .shadow-root { ... }
    .replace(/\bbody\s*\{/g, "body, .shadow-root {")
    // body.class { ... } → body.class, .shadow-root.class { ... }
    .replace(/\bbody(\.[a-zA-Z_-][\w-]*)\s*\{/g, "body$1, .shadow-root$1 {")
    // body[attr] { ... } → body[attr], .shadow-root[attr] { ... }
    .replace(/\bbody(\[[^\]]+\])\s*\{/g, "body$1, .shadow-root$1 {")
    // body::pseudo { ... } → body::pseudo, .shadow-root::pseudo { ... }
    .replace(/\bbody(::?[a-zA-Z-]+)\s*\{/g, "body$1, .shadow-root$1 {")
    // body in comma-separated selectors: body, other { } → body, .shadow-root, other { }
    .replace(/\bbody\s*,/g, "body, .shadow-root,");
}

interface SiteViewerProps {
  /** URL to fetch HTML content from (for /agent) */
  src?: string;
  /** Raw HTML content (for /new) */
  htmlContent?: string;
  /** Callback when content is loaded */
  onLoad?: () => void;
}

/**
 * SiteViewer - Renders HTML content using Shadow DOM for style isolation
 * 
 * Uses Shadow DOM instead of iframes to avoid mobile Safari scrolling issues
 * while maintaining CSS isolation between the generated content and the app.
 */
export function SiteViewer({ src, htmlContent, onLoad }: SiteViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<ShadowRoot | null>(null);
  const [content, setContent] = useState<string | null>(htmlContent ?? null);
  const [loading, setLoading] = useState(!!src);
  const [error, setError] = useState<string | null>(null);

  // Fetch content if src is provided
  useEffect(() => {
    if (!src) return;
    
    setLoading(true);
    setError(null);
    
    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
        return res.text();
      })
      .then((html) => {
        setContent(html);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [src]);

  // Update from prop changes (for /new live generation)
  useEffect(() => {
    if (htmlContent !== undefined) {
      setContent(htmlContent);
      setLoading(false);
    }
  }, [htmlContent]);

  // Inject content into Shadow DOM
  useEffect(() => {
    if (!containerRef.current || !content) return;

    // Attach shadow root once (or reuse existing)
    if (!shadowRef.current) {
      shadowRef.current = containerRef.current.attachShadow({ mode: "open" });
    }
    const shadow = shadowRef.current;

    // Parse the HTML document
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");

    // Remove nav/header elements to avoid duplicate headers with app shell
    doc.querySelectorAll("nav, header").forEach((el) => el.remove());

    // Extract styles and rewrite body selectors for shadow DOM compatibility
    const rawStyles = Array.from(doc.querySelectorAll("style"))
      .map((s) => s.textContent || "")
      .join("\n");
    const styles = `<style>${rewriteBodySelectors(rawStyles)}</style>`;

    // Extract stylesheet links (fonts, external CSS)
    const styleLinks = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'))
      .map((l) => l.outerHTML)
      .join("\n");

    // Preserve html/body classes for dark mode, themes, etc.
    const htmlClass = doc.documentElement.className || "";
    const bodyClass = doc.body.className || "";
    const bodyStyle = doc.body.getAttribute("style") || "";

    // Check for dark mode - inherit from parent document
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    // Build shadow content with proper structure for scrolling
    shadow.innerHTML = `
      ${styleLinks}
      ${styles}
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
          overflow: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }
        .shadow-root {
          min-height: 100%;
          max-width: 640px;
          margin-left: auto;
          margin-right: auto;
          padding-left: 24px;
          padding-right: 24px;
        }
      </style>
      <div class="shadow-root ${htmlClass} ${bodyClass}" style="${bodyStyle}" data-theme="${prefersDark ? 'dark' : 'light'}">
        ${doc.body.innerHTML}
      </div>
    `;

    // Notify parent that content is loaded
    onLoad?.();
  }, [content, onLoad]);

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-black/50 dark:text-white/50">
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-500/70">
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  // No content
  if (!content) {
    return (
      <div className="flex-1 flex items-center justify-center text-black/50 dark:text-white/50">
        <span className="text-sm">No content</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 bg-white dark:bg-[#0a0a0a]"
    />
  );
}

