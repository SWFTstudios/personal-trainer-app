import type { Metadata, Viewport } from "next";
import { productName } from "@/lib/env";
import { getThemeCookie } from "@/lib/theme";
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
    { media: "(prefers-color-scheme: light)", color: "#f7f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e11" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await getThemeCookie();
  return (
    <html lang="en" data-theme={theme && theme !== "system" ? theme : undefined} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Barlow+Condensed:wght@600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
