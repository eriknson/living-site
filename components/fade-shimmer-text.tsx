"use client";

interface FadeTextProps {
  text: string;
  /** Delay before animation starts (ms) */
  delay?: number;
  className?: string;
}

/**
 * Simple fade-in text animation.
 * Re-animates when text changes.
 */
export function FadeShimmerText({ 
  text, 
  delay = 150, 
  className 
}: FadeTextProps) {
  return (
    <span
      key={text}
      className={`animate-soft-fade-in ${className ?? ""}`.trim()}
      style={{
        animationDelay: `${delay}ms`,
      }}
    >
      {text}
    </span>
  );
}
