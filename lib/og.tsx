import { ImageResponse } from "next/og";

export const ogSize = {
  width: 1200,
  height: 630,
};

export const ogContentType = "image/png";

/**
 * Creates an OG image with a title and optional subtitle.
 * Matches the design language of post OG images.
 */
export function createOgImage(title: string, subtitle?: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: 80,
          backgroundColor: "#0a0a0a",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 500,
            color: "#e5e5e5",
            lineHeight: 1.15,
            marginBottom: subtitle ? 32 : 0,
            maxWidth: "100%",
          }}
        >
          {title}
        </div>

        {/* Optional subtitle */}
        {subtitle && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 28,
              color: "rgba(255, 255, 255, 0.5)",
            }}
          >
            <span>{subtitle}</span>
          </div>
        )}
      </div>
    ),
    { ...ogSize }
  );
}
