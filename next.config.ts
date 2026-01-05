import type { NextConfig } from "next";

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

export default nextConfig;
