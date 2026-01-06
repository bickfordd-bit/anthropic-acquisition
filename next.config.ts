import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const disableImageOptimization =
  process.env.NETLIFY === "true" ||
  process.env.NEXT_PUBLIC_DISABLE_IMAGE_OPTIMIZATION === "true";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: disableImageOptimization,
  },
};

// Injected content via Sentry wizard below

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the Sentry DSN in your .env matches the DNS expected by this route.
  tunnelRoute: "/monitoring",

  // Hides source maps from generated client bundles
  sourcemaps: {
    disable: true,
  },

  // Webpack plugin options
  webpack: {
    // Automatically tree-shake Sentry logger statements to reduce bundle size
    treeshake: {
      removeDebugLogging: true,
    },
    // Automatically annotate React components to show their full name in breadcrumbs and session replay
    reactComponentAnnotation: {
      enabled: true,
    },
    // Enables automatic instrumentation of Vercel Cron Monitors
    automaticVercelMonitors: true,
  },
});
