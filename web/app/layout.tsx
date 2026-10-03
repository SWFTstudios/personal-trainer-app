import type { Metadata } from "next";
import { productName } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  title: productName,
  description: "Booking, payments, intake and a landing page for independent personal trainers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
