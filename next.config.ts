import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const supabaseUrl = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
);

const nextConfig: NextConfig = {
  images: {
    // Public bazaar photos (bucket bazaar-photos) for the directory (US6).
    remotePatterns: [
      {
        protocol: supabaseUrl.protocol.replace(":", "") as "http" | "https",
        hostname: supabaseUrl.hostname,
        port: supabaseUrl.port,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  telemetry: false,
  // Source maps are uploaded only when SENTRY_AUTH_TOKEN is set (Vercel production builds).
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
