import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "African ANSP Peer Review Program",
  description: "ICAO-endorsed peer review mechanism for African ANSPs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
