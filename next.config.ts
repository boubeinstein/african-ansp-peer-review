import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("./next-pwa.config.js");

const nextConfig: NextConfig = {
  /* config options here */
};

export default withPWA(withNextIntl(nextConfig));
