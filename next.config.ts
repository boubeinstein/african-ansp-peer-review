import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withSerwistInit from "@serwist/next";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  register: true,
  reloadOnOnline: true,
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSerwist(withNextIntl(nextConfig));
