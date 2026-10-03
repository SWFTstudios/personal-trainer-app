import type { Metadata } from "next";
import { productName } from "@/lib/env";
import "./globals.css";

export function generateMetadata(): Metadata {
  return {
    title: productName(),
    description: "Website, booking, payments and client intake for independent personal trainers.",
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
