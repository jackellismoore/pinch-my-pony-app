import type { NextConfig } from "next";

const noStoreHeaders = [
  { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
  { key: "Pragma", value: "no-cache" },
  { key: "Expires", value: "0" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/", headers: noStoreHeaders },
      { source: "/login", headers: noStoreHeaders },
      { source: "/messages/:path*", headers: noStoreHeaders },
      { source: "/dashboard/:path*", headers: noStoreHeaders },
      { source: "/profile/:path*", headers: noStoreHeaders },
      { source: "/verify/:path*", headers: noStoreHeaders },
      {
        source: "/sw.js",
        headers: [
          ...noStoreHeaders,
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
