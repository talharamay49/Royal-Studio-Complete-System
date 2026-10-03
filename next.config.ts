import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  devIndicators: false,
  allowedDevOrigins: [
    "*.run.app",
    "ais-dev-tzpmwp2f2uw2qryleoyvcy-966627309284.asia-east1.run.app",
    "ais-pre-tzpmwp2f2uw2qryleoyvcy-966627309284.asia-east1.run.app",
    "localhost:3000",
  ],
};

export default nextConfig;
