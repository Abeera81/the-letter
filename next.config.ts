import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The letter text is never persisted, so there is nothing to cache or revalidate.
  reactStrictMode: true,
};

export default nextConfig;
