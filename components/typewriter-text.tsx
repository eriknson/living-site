"use client";

import { motion, AnimatePresence } from "motion/react";

interface TypewriterTextProps {
  text: string;
  /** Delay before animation starts (ms) */
  delay?: number;
  /** Duration for full text to appear (ms) */
  duration?: number;
  className?: string;
}

/**
 * Typewriter animation component that reveals text word by word.
 * Fast and subtle - not the classic slow typewriter effect.
 * 
 * Re-animates automatically when `text` changes.
 */
export function TypewriterText({ 
  text, 
  delay = 150, 
  duration = 350,
  className 
}: TypewriterTextProps) {
  const words = text.split(" ");
  const staggerDelay = duration / words.length / 1000; // Convert to seconds

  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={text} // Re-animate when text changes
        className={className}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: staggerDelay,
              delayChildren: delay / 1000,
            },
          },
        }}
      >
        {words.map((word, i) => (
          <motion.span
            key={`${word}-${i}`}
            variants={{
              hidden: { opacity: 0 },
              visible: { 
                opacity: 1,
                transition: { duration: 0.08 }
              },
            }}
          >
            {word}{i < words.length - 1 ? " " : ""}
          </motion.span>
        ))}
      </motion.span>
    </AnimatePresence>
  );
}
