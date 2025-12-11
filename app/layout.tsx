import type { Metadata } from "next";
import "./globals.css";
import { MenuBar } from "@/components/menu-bar";

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
      <body>
        <MenuBar />
        <main className="pt-[var(--menu-bar-height)]">{children}</main>
      </body>
    </html>
  );
}
