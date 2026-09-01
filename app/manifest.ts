import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pinch My Pony",
    short_name: "Pinch My Pony",
    description: "Borrow, share and connect with the equestrian community.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f1e7",
    theme_color: "#173d2c",
    icons: [
      { src: "/pmp-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/pmp-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
