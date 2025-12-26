import { createOgImage, ogSize, ogContentType } from "@/lib/og";

export const alt = "Generate";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return createOgImage("Generate");
}
