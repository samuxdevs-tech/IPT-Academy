import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  env: {
    NEXT_PUBLIC_GROQ_API_KEY:
      process.env.NEXT_PUBLIC_GROQ_API_KEY || process.env.GROQ_API_KEY || "",
  },
  experimental: {
    agentUpgrade: "security",
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
