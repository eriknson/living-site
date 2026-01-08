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
          alignItems: "center",
          justifyContent: "center",
          padding: 80,
          backgroundColor: "#FFD700",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 500,
            color: "#000000",
            lineHeight: 1.2,
            marginBottom: subtitle ? 32 : 0,
            textAlign: "center",
            maxWidth: "90%",
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
              justifyContent: "center",
              width: "100%",
              fontSize: 36,
              lineHeight: 1.3,
              color: "rgba(255, 255, 255, 0.5)",
              textAlign: "center",
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
