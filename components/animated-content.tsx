"use client";

import { AnimatePresence, motion } from "motion/react";
import { ReactNode } from "react";

interface AnimatedContentProps {
  /** Unique key that triggers re-animation when changed */
  contentKey: string;
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper component that animates content entry/exit.
 * Use for model switching, view transitions, etc.
 * 
 * Pass a unique `contentKey` - when it changes, the content
 * will animate out and the new content will animate in.
 */
export function AnimatedContent({ contentKey, children, className }: AnimatedContentProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={contentKey}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -2 }}
        transition={{
          duration: 0.15,
          ease: [0, 0, 0.2, 1], // ease-out
        }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
