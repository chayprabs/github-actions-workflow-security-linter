import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope } from "next/font/google";

import { PageShell } from "@/components/layout/page-shell";

import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "Authos",
    template: "%s | Authos",
  },
  description:
    "Authos is a collection of browser-based developer tools for CI, config, schema, and infrastructure files.",
  openGraph: {
    description:
      "Authos is a collection of browser-based developer tools for CI, config, schema, and infrastructure files.",
    siteName: "Authos",
    title: "Authos",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${ibmPlexMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <PageShell>{children}</PageShell>
      </body>
    </html>
  );
}
