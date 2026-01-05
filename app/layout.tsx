import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bickford Live Filing",
  description: "Ledger-first Live Filing UI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
