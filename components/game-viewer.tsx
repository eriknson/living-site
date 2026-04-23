"use client";

import { useCallback, useRef, useState } from "react";

interface GameViewerProps {
  src: string;
  onLoad?: () => void;
}

/**
 * Renders a game HTML file in a sandboxed iframe.
 *
 * Unlike SiteViewer (Shadow DOM), games need true browser isolation:
 * full viewport control, pointer lock, audio context, requestAnimationFrame,
 * and touch events without scroll-jacking conflicts.
 *
 * Sandbox: allow-scripts is required for JS execution. allow-pointer-lock
 * enables FPS-style or drag-based games. We intentionally omit
 * allow-same-origin to prevent the iframe from accessing parent cookies,
 * storage, or DOM. allow-popups is omitted to block window.open.
 */
export function GameViewer({ src, onLoad }: GameViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);

  const handleLoad = useCallback(() => {
    setLoading(false);
    onLoad?.();
  }, [onLoad]);

  return (
    <div className="relative flex-1 min-h-0 bg-black">
      <iframe
        ref={iframeRef}
        src={src}
        title="Game"
        sandbox="allow-scripts allow-pointer-lock"
        allow="autoplay; fullscreen; gamepad"
        onLoad={handleLoad}
        className="absolute inset-0 w-full h-full border-0"
        style={{ colorScheme: "normal" }}
      />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black">
          <span className="text-sm text-white/50 font-mono">Loading game...</span>
        </div>
      )}
    </div>
  );
}
