import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Erik's Website",
  description: "A living personal website that regenerates daily with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

