"use client";

interface SiteFrameProps {
  src: string;
  title: string;
}

export function SiteFrame({ src, title }: SiteFrameProps) {
  return (
    <iframe
      src={src}
      title={title}
      className="w-full h-[calc(100vh-var(--menu-bar-height))] border-0"
    />
  );
}

