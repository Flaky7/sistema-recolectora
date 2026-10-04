import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {};

export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  telemetry: false,
  // Source maps are uploaded only when SENTRY_AUTH_TOKEN is set (Vercel production builds).
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
