import type { Metadata, Viewport } from "next";
import { productName } from "@/lib/env";
import { getThemeCookie } from "@/lib/theme";
import "@fontsource-variable/outfit";
import "@fontsource-variable/fraunces";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "./globals.css";

export function generateMetadata(): Metadata {
  return {
    title: productName(),
    description: "Website, booking, video library, live alerts and workout tracking for independent personal trainers.",
    appleWebApp: { capable: true, statusBarStyle: "default" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2ef" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0b0d" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await getThemeCookie();
  return (
    <html lang="en" data-theme={theme && theme !== "system" ? theme : undefined} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
