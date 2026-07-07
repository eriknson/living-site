"use client";

import { Component, type ReactNode } from "react";
import { Tweet } from "react-tweet";

interface TweetEmbedProps {
  id: string;
}

interface TweetBoundaryProps {
  id: string;
  children: ReactNode;
}

interface TweetBoundaryState {
  hasError: boolean;
}

// react-tweet can throw at render time when X's syndication API returns
// tweet data in an unexpected shape (e.g. "entities is not iterable").
// Without a boundary, that throw crashes the entire post page, so we
// degrade gracefully to a link instead.
class TweetErrorBoundary extends Component<
  TweetBoundaryProps,
  TweetBoundaryState
> {
  state: TweetBoundaryState = { hasError: false };

  static getDerivedStateFromError(): TweetBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <a
          href={`https://x.com/i/status/${this.props.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl border border-black/10 dark:border-white/10 px-4 py-3 text-sm text-black/60 dark:text-white/60 hover:text-black/80 dark:hover:text-white/80 transition-colors"
        >
          View tweet on X ↗
        </a>
      );
    }
    return this.props.children;
  }
}

export function TweetEmbed({ id }: TweetEmbedProps) {
  return (
    <div className="flex justify-center not-prose">
      <TweetErrorBoundary id={id}>
        <Tweet id={id} />
      </TweetErrorBoundary>
    </div>
  );
}
