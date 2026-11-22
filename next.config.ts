import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev server only: let other devices load the game. Next blocks dev assets for any
  // host but localhost, so a friend opening http://<laptop-ip>:3000 got a frozen page.
  // Your laptop's Wi-Fi address changes per network; add it here (no port). The
  // trycloudflare.com entry is for a quick public tunnel (npx cloudflared tunnel ...).
  allowedDevOrigins: ["10.239.204.186", "**.trycloudflare.com"],
  cacheComponents: true,
  partialPrefetching: true,
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
