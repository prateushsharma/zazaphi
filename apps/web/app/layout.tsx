import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZaZaPHI — AI App Builder",
  description: "The orchestration layer is the product.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
