import { createOgImage, ogSize, ogContentType } from "@/lib/og";

export const alt = "Build History";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return createOgImage("Build History");
}
