import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FMCG Distribution ERP",
  description: "Enterprise Distribution Management System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}
