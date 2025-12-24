"use client";

import { motion } from "motion/react";

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
    <motion.span
      key={text}
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ 
        duration: 0.3, 
        delay: delay / 1000,
        ease: [0, 0, 0.2, 1]
      }}
    >
      {text}
    </motion.span>
  );
}
