import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export const metadata: Metadata = {
  title: "Erik Nilsson",
  description: "Product Design",
  metadataBase: new URL("https://eriks.design"),
  openGraph: {
    title: "Erik Nilsson",
    description: "Product Design",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Erik Nilsson",
    description: "Product Design",
    creator: "@flowstated",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Erik Nilsson",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://va.vercel-scripts.com" />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

