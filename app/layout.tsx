import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

