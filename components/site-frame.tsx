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
      className="w-full border-0"
      style={{
        height: "var(--content-height)",
      }}
    />
  );
}

