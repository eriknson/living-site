import { createOgImage, ogSize, ogContentType } from "@/lib/og";

export const alt = "Erik Nilsson";
export const size = ogSize;
export const contentType = ogContentType;

export default function Image() {
  return createOgImage("Erik Nilsson");
}
