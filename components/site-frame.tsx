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
      className="w-full h-full border-0"
    />
  );
}

