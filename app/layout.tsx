import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { AnalyticsProvider } from "@/components/analytics-provider";
import "./globals.css";

// Variable Inter with a system fallback; feature settings applied in globals.css
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfdfc" },
    { media: "(prefers-color-scheme: dark)", color: "#111110" },
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
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://va.vercel-scripts.com" />
      </head>
      <body>
        <AnalyticsProvider />
        {children}
        <Analytics />
      </body>
    </html>
  );
}

