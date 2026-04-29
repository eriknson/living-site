"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Rewrites CSS selectors so styles meant for :root / html / body apply
 * to the `.shadow-root` wrapper inside Shadow DOM.
 */
function rewriteSelectorsForShadow(css: string): string {
  return css
    // :root { ... } → :host, .shadow-root { ... }
    .replace(/(?<![.\-\w]):root\s*\{/g, ":host, .shadow-root {")
    // :root[attr] { ... } → :host, .shadow-root[attr] { ... }
    .replace(/(?<![.\-\w]):root(\[[^\]]+\])\s*\{/g, ":host, .shadow-root$1 {")
    // html { ... } → :host, .shadow-root { ... }
    .replace(/\bhtml\s*\{/g, ":host, .shadow-root {")
    // html[attr] { ... } → :host, .shadow-root[attr] { ... }
    .replace(/\bhtml(\[[^\]]+\])\s*\{/g, ":host, .shadow-root$1 {")
    // html in comma-separated selectors: html, other → :host, other
    // (Avoid mapping `html` onto `.shadow-root` here so combined `html, body`
    // rules don't end up applying scroll-container properties to the wrapper
    // and competing with the real `:host` scroll container.)
    .replace(/\bhtml\s*,/g, ":host,")
    // body { ... } → .shadow-root { ... }
    .replace(/\bbody\s*\{/g, ".shadow-root {")
    // body.class { ... } → .shadow-root.class { ... }
    .replace(/\bbody(\.[a-zA-Z_-][\w-]*)\s*\{/g, ".shadow-root$1 {")
    // body[attr] { ... } → .shadow-root[attr] { ... }
    .replace(/\bbody(\[[^\]]+\])\s*\{/g, ".shadow-root$1 {")
    // body::pseudo { ... } → .shadow-root::pseudo { ... }
    .replace(/\bbody(::?[a-zA-Z-]+)\s*\{/g, ".shadow-root$1 {")
    // body in comma-separated selectors: body, other → .shadow-root, other
    .replace(/\bbody\s*,/g, ".shadow-root,");
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

    // Set scrolling behavior on the host element directly.
    // This avoids relying only on :host CSS, which can be brittle across browsers.
    containerRef.current.style.overflowY = "auto";
    containerRef.current.style.overflowX = "hidden";
    containerRef.current.style.overscrollBehaviorY = "contain";
    containerRef.current.style.touchAction = "pan-y";
    containerRef.current.style.setProperty("-webkit-overflow-scrolling", "touch");

    // Attach shadow root once (or reuse existing)
    if (!shadowRef.current) {
      shadowRef.current = containerRef.current.attachShadow({ mode: "open" });
    }
    const shadow = shadowRef.current;

    // Parse the HTML document
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");

    // Extract styles and rewrite selectors for shadow DOM compatibility.
    // Skip the build-time `__living_site_scroll_guard` block: it is meant for
    // iframe rendering and, once rewritten, turns `.shadow-root` into a
    // competing scroll container with `overscroll-behavior-y: contain`,
    // which breaks desktop wheel scrolling on the real `:host` container.
    const rawStyles = Array.from(doc.querySelectorAll("style"))
      .filter((s) => s.id !== "__living_site_scroll_guard")
      .map((s) => s.textContent || "")
      .join("\n");
    const rewrittenStyles = rewriteSelectorsForShadow(rawStyles);

    // Extract stylesheet link hrefs for loading
    const stylesheetHrefs = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'))
      .map((l) => (l as HTMLLinkElement).getAttribute("href"))
      .filter((href): href is string => !!href);

    // Preserve html/body classes for dark mode, themes, etc.
    const htmlClass = doc.documentElement.className || "";
    const bodyClass = doc.body.className || "";
    const bodyStyle = doc.body.getAttribute("style") || "";

    // Check for dark mode - inherit from parent document
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    // Clear shadow DOM and rebuild with trackable elements
    shadow.innerHTML = "";

    // Track stylesheet loading to avoid FOUC
    let loadedCount = 0;
    const totalLinks = stylesheetHrefs.length;

    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount >= totalLinks) {
        onLoad?.();
      }
    };

    // Insert link elements with load handlers
    stylesheetHrefs.forEach((href) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.onload = checkAllLoaded;
      link.onerror = checkAllLoaded; // Don't block on failed loads
      shadow.appendChild(link);
    });

    // Add inline styles
    const inlineStyleEl = document.createElement("style");
    inlineStyleEl.textContent = rewrittenStyles;
    shadow.appendChild(inlineStyleEl);

    // Add host styles for scrolling. This block is appended AFTER the
    // rewritten generated styles so its `!important` rules win on source order
    // and pin the shadow host as the single vertical scroll container.
    const hostStyleEl = document.createElement("style");
    hostStyleEl.textContent = `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        overscroll-behavior-y: contain;
        -webkit-overflow-scrolling: touch;
        touch-action: pan-y;
      }
      .shadow-root {
        min-height: 100%;
        /*
         * Keep the wrapper out of the scroll chain. Generated body styles
         * (e.g. \`overflow-x: hidden\` or \`overscroll-behavior-y: contain\`)
         * would otherwise force \`.shadow-root\` into its own scroll context
         * and trap desktop wheel events before they reach \`:host\`.
         */
        overflow: visible !important;
        overscroll-behavior: auto !important;
      }
    `;
    shadow.appendChild(hostStyleEl);

    // Add body content wrapper
    const wrapper = document.createElement("div");
    wrapper.className = `shadow-root ${htmlClass} ${bodyClass}`;
    if (bodyStyle) wrapper.setAttribute("style", bodyStyle);
    wrapper.setAttribute("data-theme", prefersDark ? "dark" : "light");
    wrapper.innerHTML = doc.body.innerHTML;
    shadow.appendChild(wrapper);

    // If no external stylesheets, notify immediately
    if (totalLinks === 0) {
      onLoad?.();
    }
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
      className="flex-1 min-h-0"
    />
  );
}

