import { createOgImage, ogSize, ogContentType } from "@/lib/og";

export const alt = "Play";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return createOgImage("Play");
}
