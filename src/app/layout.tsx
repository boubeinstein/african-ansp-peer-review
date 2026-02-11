import type { Metadata, Viewport } from "next";
import { Montserrat, Source_Sans_3 } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-source-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AAPRP - African ANSP Peer Review Programme",
    template: "%s | AAPRP",
  },
  description: "Collaborative Excellence in Aviation Safety — ICAO-endorsed peer review platform for African Air Navigation Service Providers",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
  },
  openGraph: {
    title: "AAPRP - African ANSP Peer Review Programme",
    description: "Collaborative Excellence in Aviation Safety",
    images: [{ url: "/images/logos/social/og-image-1200x630.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AAPRP - African ANSP Peer Review Programme",
    description: "Collaborative Excellence in Aviation Safety",
    images: ["/images/logos/social/twitter-card-1200x600.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AAPRP",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#1e40af",
    "msapplication-tap-highlight": "no",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1e293b" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body
        className={`${montserrat.variable} ${sourceSans.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
