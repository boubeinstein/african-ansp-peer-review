import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "African ANSP Peer Review",
  description: "Collaborative Excellence in Aviation Safety",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
