import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  allowedDevOrigins: [
    "*.run.app",
    "ais-dev-tzpmwp2f2uw2qryleoyvcy-966627309284.asia-east1.run.app",
    "ais-pre-tzpmwp2f2uw2qryleoyvcy-966627309284.asia-east1.run.app",
    "localhost:3000",
  ],
};

export default nextConfig;
