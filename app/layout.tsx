import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Funded — weekly intel",
  description: "Newly funded startups, with a tailored way in.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
