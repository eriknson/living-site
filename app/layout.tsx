import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { IBM_Plex_Serif, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const ibmPlexSerif = IBM_Plex_Serif({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-serif",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Erik's Website",
  description: "A living personal website that regenerates daily with Cursor CLI",
  metadataBase: new URL("https://eriks.design"),
  openGraph: {
    title: "Erik's Website",
    description: "A living personal website that regenerates daily with Cursor CLI",
    type: "website",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Erik's Website",
    description: "A living personal website that regenerates daily with Cursor CLI",
    creator: "@flowstated",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${ibmPlexSerif.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

