import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  experimental: {
    // Media uploads go through server actions.
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;

// Gives `next dev` local D1 / R2 bindings via Wrangler.
initOpenNextCloudflareForDev();
