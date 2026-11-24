import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { siteConfig } from "@/config/site";
import { AppProviders } from "@/providers";

// Self-hosted (variable, latin subset) so production builds never depend on
// fonts.googleapis.com — the Docker build previously failed when that request
// was slow/truncated.
const plusJakartaSans = localFont({
  src: "../assets/fonts/PlusJakartaSans.woff2",
  variable: "--font-plus-jakarta-sans",
  weight: "400 800",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: `${siteConfig.name} — Find Verified Doctors`, template: `%s | ${siteConfig.shortName}` },
  description: siteConfig.description,
  keywords: ["doctors", "healthcare", "India", "specialists", "find doctor", "symptoms"],
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
  },
  twitter: { card: "summary_large_image", title: siteConfig.name, description: siteConfig.description },
  // A signed-in console — keep it out of search results.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#060D1C" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // data-scroll-behavior: the global styles set `html { scroll-behavior: smooth }`;
    // this tells Next to switch it off during route changes (Next 16 guidance).
    <html
      lang="en"
      className={plusJakartaSans.variable}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body>
        <InitColorSchemeScript attribute="class" defaultMode="light" />
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
