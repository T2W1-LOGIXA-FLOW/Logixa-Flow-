import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "d2xsxph8kpxj0f.cloudfront.net", port: "", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", port: "", pathname: "/**" },
      { protocol: "https", hostname: "res.cloudinary.com", port: "", pathname: "/**" },
      { protocol: "https", hostname: "cdn.jsdelivr.net", port: "", pathname: "/**" },
      { protocol: "https", hostname: "api.qrserver.com", port: "", pathname: "/**" },
      { protocol: "https", hostname: "*.amazonaws.com", port: "", pathname: "/**" },
    ],
  },
};

export default nextConfig;
