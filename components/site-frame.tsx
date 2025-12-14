"use client";

interface SiteFrameProps {
  src: string;
  title: string;
}

export function SiteFrame({ src, title }: SiteFrameProps) {
  return (
    <div
      className="w-full overflow-auto"
      style={{
        height: "var(--content-height)",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <iframe
        src={src}
        title={title}
        className="w-full h-full border-0"
      />
    </div>
  );
}

