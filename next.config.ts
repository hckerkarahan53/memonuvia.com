import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "bxmdcyidpqtoshdwpqmn.supabase.co" },
      { protocol: "https", hostname: "images-api.printify.com" },
      { protocol: "https", hostname: "printify.com" },
      { protocol: "https", hostname: "cdn.printify.com" },
    ],
  },
};

export default nextConfig;
