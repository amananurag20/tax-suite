import type { Metadata } from "next";
import "./globals.css";
import "./summary.css";
import "./personal.css";
import "./tax-controls.css";
import "./classification.css";

export const metadata: Metadata = {
  title: "Tax Studio — FY 2025–26 Income Tax Computation",
  description: "A clean, interactive income tax computation workspace for ITR 1, 2, 3 and 4.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
