import { cn } from "@/lib/utils";

interface TextShimmerProps {
  children: string;
  className?: string;
}

export function TextShimmer({
  children,
  className,
}: TextShimmerProps) {
  return (
    <span
      className={cn(
        "inline-block bg-clip-text text-transparent",
        "bg-[length:200%_100%]",
        "animate-shimmer",
        className
      )}
      style={{
        backgroundImage: `linear-gradient(
          90deg,
          rgba(0, 0, 0, 0.3) 0%,
          rgba(0, 0, 0, 0.3) 35%,
          rgba(0, 0, 0, 0.7) 50%,
          rgba(0, 0, 0, 0.3) 65%,
          rgba(0, 0, 0, 0.3) 100%
        )`,
      }}
    >
      {children}
    </span>
  );
}
